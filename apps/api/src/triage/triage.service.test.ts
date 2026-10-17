import { describe, expect, test } from "bun:test";

// No module mocks here on purpose: bun applies mock.module process wide, and a mock of
// util/log from this file was enough to unseat another test file's mocks.

import {
    reviewBudgetForDepth,
    reviewUnitCapFromEnv,
    triageForReview,
    unitBudgetForDepth,
    unitStepBudgetForDepth,
} from "./triage.service.js";
import type { VersionDelta } from "./delta.js";

const noDelta: VersionDelta = {
    unchanged: true,
    added: [],
    removed: [],
    changed: [],
    touched: [],
    additions: 0,
    deletions: 0,
};

function fakeProvider(opts: { summary?: object; delta?: VersionDelta | null; throws?: boolean; capable?: boolean }) {
    const capable = opts.capable ?? true;
    const provider: Record<string, unknown> = {};
    if (capable) {
        provider.fetchPullRequestVersionSummary = async () => {
            if (opts.throws) throw new Error("gitlab is down");
            return {
                headSha: "abc",
                filePathList: ["src/a.ts"],
                additions: 100,
                deletions: 5,
                ...(opts.summary ?? {}),
            };
        };
        provider.fetchPullRequestVersionDelta = async () => opts.delta ?? null;
    }
    return provider as never;
}

const activityService = (reviewedHead: string | null) =>
    ({ findLastReviewedHeadSha: async () => reviewedHead }) as never;

const base = { repositoryId: 1, prIid: 7, title: "feat: thing", author: "alice" };

describe("triageForReview", () => {
    test("a rebase-only delta on an enabled repository is a skip, and the record says it was applied", async () => {
        const result = await triageForReview({
            ...base,
            provider: fakeProvider({ delta: noDelta }),
            activityService: activityService("old"),
            enabled: true,
            settings: { allowSkip: true },
        });
        expect(result.effectiveDepth).toBe("skip");
        expect(result.record.rule).toBe("rebase-only");
        expect(result.record.applied).toBe(true);
    });

    test("the same delta on a repository that has not opted in is recorded but not acted on", async () => {
        const result = await triageForReview({
            ...base,
            provider: fakeProvider({ delta: noDelta }),
            activityService: activityService("old"),
            enabled: false,
            settings: { allowSkip: true },
        });
        expect(result.record.rule).toBe("rebase-only");
        expect(result.record.depth).toBe("skip");
        expect(result.record.applied).toBe(false);
        expect(result.effectiveDepth).toBe("normal");
    });

    test("a provider failure never cancels a review: the record says why and the depth is normal", async () => {
        const result = await triageForReview({
            ...base,
            provider: fakeProvider({ throws: true }),
            activityService: activityService("old"),
            enabled: true,
        });
        expect(result.effectiveDepth).toBe("normal");
        expect(result.record.reason).toContain("gitlab is down");
        expect(result.record.applied).toBe(false);
    });

    test("a provider without a versions API still produces a record, as a first review", async () => {
        const result = await triageForReview({
            ...base,
            provider: fakeProvider({ capable: false }),
            activityService: activityService(null),
            enabled: true,
        });
        expect(result.record.rule).toBe("default");
        expect(result.record.evidence.hadDelta).toBe(false);
    });

    test("with no prior review there is no delta and the whole merge request is classified", async () => {
        const result = await triageForReview({
            ...base,
            provider: fakeProvider({ summary: { filePathList: ["README.md"], additions: 4, deletions: 0 } }),
            activityService: activityService(null),
            enabled: true,
        });
        expect(result.record.rule).toBe("docs-only");
        expect(result.effectiveDepth).toBe("light");
    });

    test("a normal depth is never marked applied, because it changes nothing", async () => {
        const result = await triageForReview({
            ...base,
            provider: fakeProvider({}),
            activityService: activityService(null),
            enabled: true,
        });
        expect(result.record.depth).toBe("normal");
        expect(result.record.applied).toBe(false);
    });
});

describe("unitBudgetForDepth", () => {
    test("light is a small budget, normal leaves the planner alone, skip is nothing", () => {
        expect(unitBudgetForDepth("light")).toBe(2);
        expect(unitBudgetForDepth("normal")).toBeNull();
        expect(unitBudgetForDepth("skip")).toBe(0);
    });

    test("a decision provider's answers are recorded beside the rule outcome and do not change the depth", async () => {
        let posted: Record<string, unknown> | null = null;
        const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
            posted = JSON.parse(String(init?.body));
            return new Response(
                JSON.stringify({
                    model: "jev-1.13.0",
                    answers: { mechanical: { type: "noul", noul: 0.97 } },
                    usage: { input_tokens: 10, output_tokens: 2 },
                }),
                { status: 200 },
            );
        }) as typeof fetch;
        const result = await triageForReview({
            ...base,
            description: "the why",
            provider: fakeProvider({ delta: noDelta }),
            activityService: activityService("old"),
            enabled: true,
            settings: { allowSkip: true },
            decision: { baseUrl: "http://decider", apiKey: null, model: "jev-latest", timeoutMs: 1000 },
            fetchImpl,
        });
        expect(result.record.rule).toBe("rebase-only");
        expect(result.effectiveDepth).toBe("skip");
        expect(result.record.decision).toEqual({
            baseUrl: "http://decider",
            model: "jev-1.13.0",
            latencyMs: expect.any(Number),
            answers: { mechanical: { type: "noul", value: 0.97 } },
            usage: { inputTokens: 10, outputTokens: 2 },
        });
        const state = (posted as unknown as { state: Record<string, unknown> }).state;
        expect(state.description).toBe("the why");
        expect(state.since_last_review).toMatchObject({ unchanged: true });
    });

    test("a failing decision provider is recorded as an error and the rules' depth stands", async () => {
        const errors: string[] = [];
        const fetchImpl = (async (_url: string | URL | Request) =>
            new Response("down", { status: 503 })) as typeof fetch;
        const result = await triageForReview({
            ...base,
            provider: fakeProvider({ delta: noDelta }),
            activityService: activityService("old"),
            enabled: false,
            decision: { baseUrl: "http://decider", apiKey: "k", model: "jev-latest", timeoutMs: 1000 },
            fetchImpl,
            logError: (message) => errors.push(message),
        });
        expect(result.record.rule).toBe("rebase-only");
        expect(result.effectiveDepth).toBe("normal");
        expect(result.record.decision?.error).toContain("returned 503");
        expect(result.record.decision?.answers).toBeUndefined();
        expect(errors).toHaveLength(1);
    });

    test("without a decision provider the record carries no decision", async () => {
        const result = await triageForReview({
            ...base,
            provider: fakeProvider({}),
            activityService: activityService(null),
            enabled: false,
            decision: null,
        });
        expect(result.record.decision).toBeUndefined();
    });
});

describe("reviewUnitCapFromEnv", () => {
    test("unset, empty or nonsense leaves the planner to decide", () => {
        expect(reviewUnitCapFromEnv({})).toBeNull();
        expect(reviewUnitCapFromEnv({ PROVAL_REVIEW_UNIT_CAP: "" })).toBeNull();
        expect(reviewUnitCapFromEnv({ PROVAL_REVIEW_UNIT_CAP: "0" })).toBeNull();
        expect(reviewUnitCapFromEnv({ PROVAL_REVIEW_UNIT_CAP: "wide" })).toBeNull();
    });

    test("a cap bounds a normal review and never raises a light one", () => {
        expect(reviewUnitCapFromEnv({ PROVAL_REVIEW_UNIT_CAP: "6" })).toBe(6);
        expect(unitBudgetForDepth("normal", 6)).toBe(6);
        expect(unitBudgetForDepth("light", 6)).toBe(2);
        expect(unitBudgetForDepth("light", 1)).toBe(1);
        expect(reviewBudgetForDepth("normal", { PROVAL_REVIEW_UNIT_CAP: "6" })).toEqual({
            unitBudget: 6,
            unitStepBudget: null,
        });
        expect(reviewBudgetForDepth("normal", {})).toEqual({ unitBudget: null, unitStepBudget: null });
    });
});

describe("unitStepBudgetForDepth", () => {
    test("light caps each unit's steps, normal leaves the loop default, skip has none", () => {
        expect(unitStepBudgetForDepth("light")).toBe(24);
        expect(unitStepBudgetForDepth("normal")).toBeNull();
        expect(unitStepBudgetForDepth("skip")).toBe(0);
    });
});

describe("triageForReview personas", () => {
    const light = () => ({
        ...base,
        provider: fakeProvider({
            delta: {
                ...noDelta,
                unchanged: false,
                changed: ["README.md"],
                touched: ["README.md"],
                additions: 3,
                deletions: 1,
            },
        }),
        activityService: activityService("old"),
    });

    test("the choice is always recorded, and only used when the repository lets triage choose", async () => {
        const recordedOnly = await triageForReview({
            ...light(),
            enabled: true,
            personaByTriage: false,
            allowedPersonaList: null,
        });
        expect(recordedOnly.record.rule).toBe("docs-only");
        expect(recordedOnly.record.personaList).toEqual(["correctness"]);
        expect(recordedOnly.record.personaApplied).toBe(false);
        expect(recordedOnly.effectivePersonaList).toBeNull();

        const applied = await triageForReview({
            ...light(),
            enabled: true,
            personaByTriage: true,
            allowedPersonaList: ["correctness", "security", "testing"],
        });
        expect(applied.record.personaApplied).toBe(true);
        expect(applied.effectivePersonaList).toEqual(["correctness"]);
    });

    test("with act on triage off, the depth is normal and the personas follow the normal path", async () => {
        const result = await triageForReview({
            ...light(),
            enabled: false,
            personaByTriage: true,
            allowedPersonaList: ["security"],
        });
        expect(result.effectiveDepth).toBe("normal");
        expect(result.record.personaReason).toBe("normal review, every enabled persona");
        expect(result.record.personaApplied).toBe(false);
        expect(result.effectivePersonaList).toEqual(["security"]);
    });
});
