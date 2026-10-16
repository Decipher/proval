import { describe, expect, test } from "bun:test";

import {
    askDecisions,
    buildTriageState,
    compactAnswers,
    decisionProviderFromEnv,
    DEFAULT_DECISION_BASE_URL,
    DEFAULT_DECISION_MODEL,
    DEFAULT_DECISION_TIMEOUT_MS,
    TRIAGE_QUESTION_SET,
} from "./decision.js";

describe("decisionProviderFromEnv", () => {
    test("nothing set means no provider, which is the default", () => {
        expect(decisionProviderFromEnv({})).toBeNull();
        expect(decisionProviderFromEnv({ JEV_API_KEY: "  ", JEV_BASE_URL: "" })).toBeNull();
    });

    test("a key alone selects the hosted service with its defaults", () => {
        expect(decisionProviderFromEnv({ JEV_API_KEY: "apik_x" })).toEqual({
            baseUrl: DEFAULT_DECISION_BASE_URL,
            apiKey: "apik_x",
            model: DEFAULT_DECISION_MODEL,
            timeoutMs: DEFAULT_DECISION_TIMEOUT_MS,
        });
    });

    test("a URL alone is a self-hosted server with no key, and a trailing slash is dropped", () => {
        const config = decisionProviderFromEnv({
            JEV_BASE_URL: "http://laya:8000/",
            JEV_MODEL: "english",
            JEV_TIMEOUT_MS: "900",
        });
        expect(config).toEqual({ baseUrl: "http://laya:8000", apiKey: null, model: "english", timeoutMs: 900 });
    });

    test("an unusable timeout falls back to the default", () => {
        expect(decisionProviderFromEnv({ JEV_API_KEY: "k", JEV_TIMEOUT_MS: "soon" })?.timeoutMs).toBe(
            DEFAULT_DECISION_TIMEOUT_MS,
        );
        expect(decisionProviderFromEnv({ JEV_API_KEY: "k", JEV_TIMEOUT_MS: "-1" })?.timeoutMs).toBe(
            DEFAULT_DECISION_TIMEOUT_MS,
        );
    });
});

describe("buildTriageState", () => {
    test("carries what the webhook already knows and flags test changes", () => {
        const state = buildTriageState({
            title: "fix: thing",
            description: "  why  ",
            author: "alice",
            filePathList: ["src/a.ts", "src/a.test.ts"],
            additions: 10,
            deletions: 2,
            delta: null,
        });
        expect(state).toEqual({
            title: "fix: thing",
            author: "alice",
            files: ["src/a.ts", "src/a.test.ts"],
            file_count: 2,
            additions: 10,
            deletions: 2,
            tests_changed: true,
            description: "why",
        });
    });

    test("a delta since the last review is summarised, and long lists are capped", () => {
        const filePathList = Array.from({ length: 250 }, (_, i) => `vendor/${i}.js`);
        const state = buildTriageState({
            title: "chore: vendor",
            author: "bot",
            filePathList,
            additions: 5000,
            deletions: 0,
            delta: {
                unchanged: false,
                added: ["vendor/1.js"],
                removed: [],
                changed: ["vendor/2.js"],
                touched: ["vendor/1.js", "vendor/2.js"],
                additions: 12,
                deletions: 0,
            },
        });
        expect((state.files as string[]).length).toBe(200);
        expect(state.file_count).toBe(250);
        expect(state.description).toBeUndefined();
        expect(state.since_last_review).toEqual({
            unchanged: false,
            touched: ["vendor/1.js", "vendor/2.js"],
            added_count: 1,
            removed_count: 0,
            changed_count: 1,
            additions: 12,
            deletions: 0,
        });
    });
});

describe("compactAnswers", () => {
    test("keeps the value and confidence of each answer and drops the probability tables", () => {
        const answers = compactAnswers({
            mechanical: { type: "noul", noul: 0.97 },
            risk_area: { type: "choice", choice: "docs", confidence: 1, probabilities: { docs: 1, code: 0 } },
            review_depth: {
                type: "score",
                score: 0,
                confidence: 1,
                legend: { "0": "glance", "1": "normal", "2": "deep" },
                probabilities: { "0": 1 },
            },
            odd: { type: "poem", text: "no" },
            broken: { type: "choice" },
        });
        expect(answers).toEqual({
            mechanical: { type: "noul", value: 0.97 },
            risk_area: { type: "choice", value: "docs", confidence: 1 },
            review_depth: { type: "score", value: "glance", level: 0, confidence: 1 },
        });
    });
});

describe("askDecisions", () => {
    const config = { baseUrl: "http://decider", apiKey: "apik_secret", model: "jev-latest", timeoutMs: 1000 };

    test("posts the Jev request shape with the bearer and returns compacted answers", async () => {
        const calls: { url: string; init: RequestInit }[] = [];
        const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
            calls.push({ url: String(url), init: init ?? {} });
            return new Response(
                JSON.stringify({
                    model: "jev-1.13.0",
                    answers: { mechanical: { type: "noul", noul: 0.2 } },
                    usage: { input_tokens: 469, output_tokens: 79 },
                }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }) as typeof fetch;
        const result = await askDecisions(config, { title: "t" }, TRIAGE_QUESTION_SET, fetchImpl);
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toBe("http://decider/v1/systemone");
        expect(calls[0].init.method).toBe("POST");
        expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer apik_secret");
        const body = JSON.parse(String(calls[0].init.body));
        expect(Object.keys(body).sort()).toEqual(["model", "questions", "state"]);
        expect(body.model).toBe("jev-latest");
        expect(body.questions.review_depth.criteria).toEqual(["glance", "normal", "deep"]);
        expect(result.model).toBe("jev-1.13.0");
        expect(result.answers).toEqual({ mechanical: { type: "noul", value: 0.2 } });
        expect(result.usage).toEqual({ inputTokens: 469, outputTokens: 79 });
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    test("no key means no Authorization header, for a self-hosted server", async () => {
        let headers: Record<string, string> = {};
        const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
            headers = (init?.headers ?? {}) as Record<string, string>;
            return new Response(JSON.stringify({ answers: {} }), { status: 200 });
        }) as typeof fetch;
        await askDecisions({ ...config, apiKey: null }, {}, TRIAGE_QUESTION_SET, fetchImpl);
        expect(headers.Authorization).toBeUndefined();
    });

    test("a non-2xx status is an error that names the status", async () => {
        const fetchImpl = (async (_url: string | URL | Request) =>
            new Response("nope", { status: 401 })) as typeof fetch;
        await expect(askDecisions(config, {}, TRIAGE_QUESTION_SET, fetchImpl)).rejects.toThrow("returned 401");
    });

    test("a slow server is a timeout, not a hang", async () => {
        const fetchImpl = ((_url: string | URL | Request, init?: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
            })) as typeof fetch;
        await expect(askDecisions({ ...config, timeoutMs: 20 }, {}, TRIAGE_QUESTION_SET, fetchImpl)).rejects.toThrow(
            "timed out after 20ms",
        );
    });
});
