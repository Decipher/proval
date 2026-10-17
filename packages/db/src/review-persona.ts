/**
 * Review personas: the perspectives a review may take. Each one is a section of the
 * review checklist the sub agents work from, so enabling a subset narrows what they
 * look for rather than adding reviewers. The keys are stored on the repository and
 * referenced from prompts, so they are the stable identifiers; titles and
 * descriptions are for the dashboard.
 */
export const reviewPersonaKeyList = [
    "correctness",
    "security",
    "performance",
    "error-handling",
    "type-safety",
    "design",
    "api-contract",
    "concurrency",
    "testing",
] as const;

export type ReviewPersonaKey = (typeof reviewPersonaKeyList)[number];

export const REVIEW_PERSONA_LIST: ReadonlyArray<{ key: ReviewPersonaKey; title: string; description: string }> = [
    { key: "correctness", title: "Correctness", description: "Logic errors and regressions" },
    { key: "security", title: "Security", description: "Vulnerabilities and secure coding" },
    { key: "performance", title: "Performance", description: "Efficiency and resource usage" },
    { key: "error-handling", title: "Error handling", description: "Swallowed failures and unvalidated input" },
    { key: "type-safety", title: "Type safety", description: "Unsafe casts and null handling" },
    { key: "design", title: "Design and maintainability", description: "Structure, duplication and naming" },
    { key: "api-contract", title: "API and contract", description: "Breaking changes and compatibility" },
    { key: "concurrency", title: "Concurrency", description: "Races, shared state and unhandled promises" },
    { key: "testing", title: "Testing", description: "Coverage and test quality" },
];

export function isReviewPersonaKey(value: unknown): value is ReviewPersonaKey {
    return typeof value === "string" && (reviewPersonaKeyList as readonly string[]).includes(value);
}
