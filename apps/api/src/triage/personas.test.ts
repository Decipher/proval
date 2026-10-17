import { describe, expect, test } from "bun:test";

import { selectPersonaList } from "./personas.js";

const decision = (answers: Record<string, unknown>) =>
    ({ baseUrl: "http://d", model: "m", latencyMs: 1, answers }) as never;

describe("selectPersonaList", () => {
    test("a normal review with no decision takes every enabled persona, as null so the prompt is unchanged", () => {
        expect(selectPersonaList({ depth: "normal", rule: "default", allowedList: null })).toEqual({
            personaList: null,
            reason: "normal review, every enabled persona",
        });
    });

    test("a light docs-only review takes correctness alone; tests-only adds testing", () => {
        expect(selectPersonaList({ depth: "light", rule: "docs-only", allowedList: null }).personaList).toEqual([
            "correctness",
        ]);
        expect(selectPersonaList({ depth: "light", rule: "tests-only", allowedList: null }).personaList).toEqual([
            "correctness",
            "testing",
        ]);
        expect(selectPersonaList({ depth: "light", rule: "small-change", allowedList: null }).personaList).toEqual([
            "correctness",
            "security",
        ]);
    });

    test("the repository's list is a ceiling: narrowing never adds a persona it disabled", () => {
        const picked = selectPersonaList({
            depth: "light",
            rule: "small-change",
            allowedList: ["security", "testing"],
        });
        expect(picked.personaList).toEqual(["security"]);
    });

    test("a narrowing that would leave nothing falls back to the repository's list", () => {
        const picked = selectPersonaList({ depth: "light", rule: "docs-only", allowedList: ["performance"] });
        expect(picked.personaList).toEqual(["performance"]);
        expect(picked.reason).toContain("none of those are enabled");
    });

    test("a confident risk area narrows a normal review; an unsure one does not", () => {
        const sure = selectPersonaList({
            depth: "normal",
            rule: "default",
            allowedList: null,
            decision: decision({ risk_area: { type: "choice", value: "dependencies", confidence: 0.9 } }),
        });
        expect(sure.personaList).toEqual(["correctness", "security", "api-contract"]);
        const unsure = selectPersonaList({
            depth: "normal",
            rule: "default",
            allowedList: null,
            decision: decision({ risk_area: { type: "choice", value: "dependencies", confidence: 0.4 } }),
        });
        expect(unsure.personaList).toBeNull();
        const code = selectPersonaList({
            depth: "normal",
            rule: "default",
            allowedList: ["security"],
            decision: decision({ risk_area: { type: "choice", value: "code", confidence: 1 } }),
        });
        expect(code.personaList).toEqual(["security"]);
    });

    test("needs a full review keeps a normal review at the full set only when very confident", () => {
        const sure = selectPersonaList({
            depth: "normal",
            rule: "default",
            allowedList: null,
            decision: decision({
                needs_full_review: { type: "noul", value: 0.95 },
                risk_area: { type: "choice", value: "docs", confidence: 1 },
            }),
        });
        expect(sure.personaList).toBeNull();
        expect(sure.reason).toContain("needs a full review");
        const usual = selectPersonaList({
            depth: "normal",
            rule: "default",
            allowedList: null,
            decision: decision({
                needs_full_review: { type: "noul", value: 0.85 },
                risk_area: { type: "choice", value: "docs", confidence: 1 },
            }),
        });
        expect(usual.personaList).toEqual(["correctness"]);
    });

    test("a light depth set by the rules is never widened by the decision provider", () => {
        const picked = selectPersonaList({
            depth: "light",
            rule: "docs-only",
            allowedList: null,
            decision: decision({ needs_full_review: { type: "noul", value: 0.99 } }),
        });
        expect(picked.personaList).toEqual(["correctness"]);
    });

    test("a skipped review has no personas", () => {
        expect(selectPersonaList({ depth: "skip", rule: "rebase-only", allowedList: null }).personaList).toEqual([]);
    });
});
