import type { ActivityTriageJson } from "@proval/db";
import type { GitProvider } from "../git-provider/types.js";
import type { ActivityService } from "../api/activity/activity.service.js";
import { hasVersionDelta } from "./capability.js";
import { askDecisions, buildTriageState, TRIAGE_QUESTION_SET, type DecisionProviderConfig } from "./decision.js";
import {
    DEFAULT_TRIAGE_SETTINGS,
    triagePullRequest,
    type TriageDepth,
    type TriageInput,
    type TriageSettings,
} from "./rules.js";

export interface TriageForReviewInput {
    provider: GitProvider;
    activityService: ActivityService;
    repositoryId: number;
    prIid: number;
    title: string;
    description?: string | null;
    author: string;
    /** Whether the repository has opted in to acting on the result. */
    enabled: boolean;
    settings?: Partial<TriageSettings>;
    /**
     * A decision provider to ask the triage questions of, or null for rules alone.
     * Its answers are recorded on the activity and never change the depth.
     */
    decision?: DecisionProviderConfig | null;
    /** Injected for tests; the decision call is the only network access here. */
    fetchImpl?: typeof fetch;
    /**
     * Where a failure is reported. Injected rather than imported because util/log pulls
     * in the activity service and its database, which must not happen on this module's
     * import path: a pure module stays easy to test and cannot pre-load what another
     * test wants to mock.
     */
    logError?: (message: string, error: unknown) => void;
}

export interface TriageForReviewResult {
    record: ActivityTriageJson;
    /** The depth to actually use: the record's when enabled, otherwise normal. */
    effectiveDepth: TriageDepth;
}

/** How many review units a depth allows the planner. Null means the planner decides. */
export function unitBudgetForDepth(depth: TriageDepth): number | null {
    switch (depth) {
        case "light":
            return 2;
        case "skip":
            return 0;
        case "normal":
            return null;
    }
}

/**
 * Runs triage for a pull request review before any activity exists.
 *
 * This never throws. A provider or network failure yields a "normal" record whose
 * reason names the failure, because a triage stage that could cancel a review by
 * erroring would be worse than no triage at all. The record is always returned so it
 * can be written to the activity whether or not it is acted on.
 */
export async function triageForReview(input: TriageForReviewInput): Promise<TriageForReviewResult> {
    const settings: TriageSettings = { ...DEFAULT_TRIAGE_SETTINGS, ...(input.settings ?? {}) };
    const logError = input.logError ?? ((message: string, cause: unknown) => console.error(message, cause));
    let record: ActivityTriageJson;
    let ruleInput: TriageInput | null = null;
    try {
        if (!hasVersionDelta(input.provider)) {
            // No versions API: the rules still run on the whole merge request from what
            // the provider can tell us, which for these providers is nothing yet.
            ruleInput = {
                title: input.title,
                author: input.author,
                filePathList: [],
                additions: 0,
                deletions: 0,
                delta: null,
                settings,
            };
            record = withApplied(triagePullRequest(ruleInput), input.enabled);
        } else {
            const summary = await input.provider.fetchPullRequestVersionSummary(input.prIid);
            const reviewedHeadSha = await input.activityService.findLastReviewedHeadSha(
                input.repositoryId,
                input.prIid,
            );
            const delta = reviewedHeadSha
                ? await input.provider.fetchPullRequestVersionDelta(input.prIid, reviewedHeadSha)
                : null;
            ruleInput = {
                title: input.title,
                author: input.author,
                filePathList: summary.filePathList,
                additions: summary.additions,
                deletions: summary.deletions,
                delta,
                settings,
            };
            record = withApplied(triagePullRequest(ruleInput), input.enabled);
        }
    } catch (error) {
        logError("Triage failed, treating the review as normal", error);
        record = {
            depth: "normal",
            rule: "default",
            reason: `triage failed: ${error instanceof Error ? error.message : String(error)}`,
            applied: false,
            evidence: { hadDelta: false, fileCount: 0, lineCount: 0, filePathList: [] },
        };
    }
    if (input.decision && ruleInput) {
        record.decision = await askTriageDecision(
            input.decision,
            ruleInput,
            input.description,
            input.fetchImpl,
            logError,
        );
    }
    return { record, effectiveDepth: record.applied ? record.depth : "normal" };
}

/**
 * Asks the provider the triage questions and returns what to record. A failure is
 * recorded as such and nothing else: the depth above was already decided by the rules,
 * so the worst a broken provider can do is cost one timeout per webhook.
 */
async function askTriageDecision(
    config: DecisionProviderConfig,
    ruleInput: TriageInput,
    description: string | null | undefined,
    fetchImpl: typeof fetch | undefined,
    logError: (message: string, error: unknown) => void,
): Promise<NonNullable<ActivityTriageJson["decision"]>> {
    const started = Date.now();
    try {
        const state = buildTriageState({ ...ruleInput, description });
        const result = await askDecisions(config, state, TRIAGE_QUESTION_SET, fetchImpl);
        return {
            baseUrl: config.baseUrl,
            model: result.model,
            latencyMs: result.latencyMs,
            answers: result.answers,
            usage: result.usage,
        };
    } catch (error) {
        logError("Decision provider failed at triage, recording the error", error);
        return {
            baseUrl: config.baseUrl,
            model: config.model,
            latencyMs: Date.now() - started,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

function withApplied(record: Omit<ActivityTriageJson, "applied">, enabled: boolean): ActivityTriageJson {
    // "applied" records whether the depth changed anything. A normal depth changes
    // nothing whether or not triage is enabled, so it is never marked applied.
    return { ...record, applied: enabled && record.depth !== "normal" };
}
