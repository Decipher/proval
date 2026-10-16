import type { ActivityTriageDecisionJson } from "@proval/db";
import type { VersionDelta } from "./delta.js";

/**
 * A decision provider speaks the Jev wire protocol: POST /v1/systemone with a state and
 * a set of typed questions, answered in one forward pass with calibrated confidences.
 * The hosted service (TypeSafe) and a self-hosted laya-serve both speak it, so one
 * adapter covers both and the choice is a base URL.
 */
export interface DecisionProviderConfig {
    baseUrl: string;
    /** Null for a self-hosted server that runs without a key. */
    apiKey: string | null;
    model: string;
    timeoutMs: number;
}

export const DEFAULT_DECISION_BASE_URL = "https://api.typesafe.ai";
export const DEFAULT_DECISION_MODEL = "jev-latest";
export const DEFAULT_DECISION_TIMEOUT_MS = 5000;

/**
 * Reads the provider from the environment. Null when neither JEV_API_KEY nor
 * JEV_BASE_URL is set, which is the default and means triage runs on rules alone. The
 * hosted service needs a key and takes the default URL; a self-hosted laya-serve needs
 * a URL and no key.
 */
export function decisionProviderFromEnv(
    env: Record<string, string | undefined> = process.env,
): DecisionProviderConfig | null {
    const apiKey = (env.JEV_API_KEY ?? "").trim();
    const baseUrl = (env.JEV_BASE_URL ?? "").trim();
    if (!apiKey && !baseUrl) return null;
    const timeout = Number.parseInt(env.JEV_TIMEOUT_MS ?? "", 10);
    return {
        baseUrl: (baseUrl || DEFAULT_DECISION_BASE_URL).replace(/\/+$/, ""),
        apiKey: apiKey || null,
        model: (env.JEV_MODEL ?? "").trim() || DEFAULT_DECISION_MODEL,
        timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_DECISION_TIMEOUT_MS,
    };
}

export type DecisionQuestion =
    | { type: "noul"; instructions: string }
    | { type: "choice"; instructions: string; criteria: Record<string, string> }
    | { type: "score"; instructions: string; criteria: string[] };

/**
 * The questions asked of every pull request at triage. Answers are recorded on the
 * activity beside the rule outcome and are not acted on: the point for now is to collect
 * labelled examples against reviews that actually ran, so a later evaluation can say
 * whether the model beats the rules on this instance before anything trusts it.
 */
export const TRIAGE_QUESTION_SET: Record<string, DecisionQuestion> = {
    mechanical: {
        type: "noul",
        instructions:
            "Is this change mechanical: documentation only, formatting, a version or dependency bump, a rebase, or vendoring, with no change to behaviour?",
    },
    risk_area: {
        type: "choice",
        instructions: "Which area does this change most affect?",
        criteria: {
            docs: "documentation or comments only",
            config: "build, CI, tooling or configuration",
            tests: "tests only",
            dependencies: "dependency or lock file updates",
            code: "application code that runs in production",
        },
    },
    review_depth: {
        type: "score",
        instructions:
            "How deep a code review does this change deserve? glance means a skim is enough, normal a standard review, deep a careful review by someone who knows the code.",
        criteria: ["glance", "normal", "deep"],
    },
    needs_full_review: {
        type: "noul",
        instructions:
            "Would skipping or shortening the review of this change risk missing a correctness, security or deployment problem?",
    },
};

export interface TriageStateInput {
    title: string;
    description?: string | null;
    author: string;
    filePathList: string[];
    additions: number;
    deletions: number;
    delta: VersionDelta | null;
}

const MAX_DESCRIPTION_CHARS = 4000;
const MAX_PATH_COUNT = 200;
const TEST_PATH_PATTERN = /(^|\/)(test|tests|spec|specs|__tests__|__snapshots__)(\/|$)|\.(test|spec)\.[a-z]+$/i;

/**
 * The state the model sees: what the webhook and the versions API already told us, and
 * nothing that needs a clone. Lists are capped so a vendoring change cannot blow the
 * context budget.
 */
export function buildTriageState(input: TriageStateInput): Record<string, unknown> {
    const paths = input.filePathList.slice(0, MAX_PATH_COUNT);
    const state: Record<string, unknown> = {
        title: input.title,
        author: input.author,
        files: paths,
        file_count: input.filePathList.length,
        additions: input.additions,
        deletions: input.deletions,
        tests_changed: input.filePathList.some((p) => TEST_PATH_PATTERN.test(p)),
    };
    const description = (input.description ?? "").trim();
    if (description) state.description = description.slice(0, MAX_DESCRIPTION_CHARS);
    if (input.delta) {
        state.since_last_review = {
            unchanged: input.delta.unchanged,
            touched: input.delta.touched.slice(0, MAX_PATH_COUNT),
            added_count: input.delta.added.length,
            removed_count: input.delta.removed.length,
            changed_count: input.delta.changed.length,
            ...(input.delta.additions !== undefined ? { additions: input.delta.additions } : {}),
            ...(input.delta.deletions !== undefined ? { deletions: input.delta.deletions } : {}),
        };
    }
    return state;
}

export type DecisionAnswerMap = NonNullable<ActivityTriageDecisionJson["answers"]>;

export interface DecisionResult {
    model: string;
    answers: DecisionAnswerMap;
    usage: { inputTokens: number; outputTokens: number } | null;
    latencyMs: number;
}

/**
 * One call to the provider. Throws on a transport error, a non-2xx status, a timeout
 * or an unreadable body; the caller decides what a failure means, which at triage is
 * "record the error and carry on".
 */
export async function askDecisions(
    config: DecisionProviderConfig,
    state: Record<string, unknown>,
    questions: Record<string, DecisionQuestion>,
    fetchImpl: typeof fetch = fetch,
): Promise<DecisionResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    const started = Date.now();
    let response: Response;
    try {
        response = await fetchImpl(`${config.baseUrl}/v1/systemone`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
            },
            body: JSON.stringify({ model: config.model, state, questions }),
            signal: controller.signal,
        });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error(`decision provider timed out after ${config.timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
    const latencyMs = Date.now() - started;
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`decision provider returned ${response.status}: ${text.slice(0, 200)}`);
    }
    const body = (await response.json()) as {
        model?: string;
        answers?: Record<string, Record<string, unknown>>;
        usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
        model: typeof body.model === "string" ? body.model : config.model,
        answers: compactAnswers(body.answers ?? {}),
        usage:
            body.usage && typeof body.usage.input_tokens === "number"
                ? { inputTokens: body.usage.input_tokens, outputTokens: body.usage.output_tokens ?? 0 }
                : null,
        latencyMs,
    };
}

/**
 * Keeps what a reader of the activity needs from each answer: the value and how sure
 * the model was. The probability tables are dropped; they are large and the confidence
 * already summarises them. An answer of an unknown shape is dropped rather than
 * guessed at.
 */
export function compactAnswers(raw: Record<string, Record<string, unknown>>): DecisionAnswerMap {
    const out: DecisionAnswerMap = {};
    for (const [key, answer] of Object.entries(raw)) {
        if (!answer || typeof answer !== "object") continue;
        const confidence = typeof answer.confidence === "number" ? answer.confidence : 0;
        switch (answer.type) {
            case "noul":
                if (typeof answer.noul === "number") out[key] = { type: "noul", value: answer.noul };
                break;
            case "choice":
                if (typeof answer.choice === "string") out[key] = { type: "choice", value: answer.choice, confidence };
                break;
            case "score": {
                // The score is the expected level, a real number such as 1.2, so the
                // label is the nearest level's; the raw score is kept as the level.
                if (typeof answer.score !== "number") break;
                const legend = (answer.legend ?? {}) as Record<string, string>;
                const label = legend[String(Math.round(answer.score))];
                out[key] = {
                    type: "score",
                    value: typeof label === "string" ? label : String(answer.score),
                    level: answer.score,
                    confidence,
                };
                break;
            }
        }
    }
    return out;
}
