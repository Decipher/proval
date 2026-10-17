import { describe, expect, test } from "bun:test";
import { reviewPersonaKeyList } from "@proval/db";

import { buildReviewChecklist, REVIEW_CHECKLIST } from "./review.js";

describe("buildReviewChecklist", () => {
    test("every persona is the checklist as it was before personas existed", () => {
        const all = buildReviewChecklist(null);
        expect(all).toBe(REVIEW_CHECKLIST);
        expect(all.startsWith("# What to Review")).toBe(true);
        for (const heading of [
            "Correctness",
            "Security",
            "Performance",
            "Error Handling",
            "Type Safety & Null Handling",
            "Design & Maintainability",
            "API & Contract",
            "Concurrency",
            "Testing",
        ]) {
            expect(all).toContain(`\n${heading}\n`);
        }
        expect(buildReviewChecklist([...reviewPersonaKeyList])).toBe(all);
    });

    test("a subset keeps the fixed order and drops the other sections", () => {
        const some = buildReviewChecklist(["testing", "security"]);
        expect(some).toContain("\nSecurity\n");
        expect(some).toContain("\nTesting\n");
        expect(some).not.toContain("Performance");
        expect(some).not.toContain("Correctness");
        expect(some.indexOf("Security")).toBeLessThan(some.indexOf("Testing"));
    });

    test("no persona leaves only the header, so a sub agent still knows how to report", () => {
        const none = buildReviewChecklist([]);
        expect(none.startsWith("# What to Review")).toBe(true);
        expect(none).not.toContain("\nCorrectness\n");
    });
});
