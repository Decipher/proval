import type { ActivityTriageDecisionJson } from "@proval/db";
import { reviewPersonaKeyList, type ReviewPersonaKey } from "@proval/db";
import type { TriageDepth } from "./rules.js";

/**
 * Which personas a review takes, decided per pull request from the triage outcome.
 *
 * A repository's persona list is the ceiling: triage only ever narrows it. A light
 * review (docs, tests, a small or rebased delta) takes the one or two personas that
 * can still find something in that kind of change; a normal review takes everything
 * the repository allows, unless a confident decision about the risk area says a
 * narrower set covers it. A very confident "needs a full review" answer keeps a
 * normal review at the full set. A selection that would leave nothing falls back to the repository's list,
 * because a review with nothing to look for is never the right outcome.
 */
export interface PersonaSelectionInput {
    depth: TriageDepth;
    rule: string;
    decision?: ActivityTriageDecisionJson | null;
    /** The repository's persona list; null is every persona. */
    allowedList: ReviewPersonaKey[] | null;
}

export interface PersonaSelection {
    /** Null means every persona the repository allows, which keeps the prompt as it was. */
    personaList: ReviewPersonaKey[] | null;
    reason: string;
}

/** Confidence a choice answer needs before it narrows a normal review. */
export const RISK_AREA_CONFIDENCE_FLOOR = 0.6;
/**
 * Probability above which "needs a full review" overrides the risk area narrowing of
 * a normal review. It does not override a light depth: the rules that set light
 * (docs only, tests only, a small or rebased delta) read the actual change, and the
 * first day of answers put this score at 0.79 or higher on nearly every pull
 * request, documentation included, which would have switched personas off entirely.
 */
export const NEEDS_FULL_REVIEW_FLOOR = 0.9;

const LIGHT_BY_RULE: Record<string, ReviewPersonaKey[]> = {
    "docs-only": ["correctness"],
    "tests-only": ["testing", "correctness"],
};
const LIGHT_DEFAULT: ReviewPersonaKey[] = ["correctness", "security"];

const BY_RISK_AREA: Record<string, ReviewPersonaKey[] | null> = {
    docs: ["correctness"],
    tests: ["testing", "correctness"],
    config: ["correctness", "security", "error-handling"],
    dependencies: ["security", "api-contract", "correctness"],
    code: null,
};

export function selectPersonaList(input: PersonaSelectionInput): PersonaSelection {
    const allowed = input.allowedList ?? [...reviewPersonaKeyList];
    const narrow = (wanted: ReviewPersonaKey[], reason: string): PersonaSelection => {
        const list = allowed.filter((key) => wanted.includes(key));
        if (list.length === 0) {
            return {
                personaList: input.allowedList,
                reason: `${reason}; none of those are enabled, so every enabled persona`,
            };
        }
        return { personaList: list, reason };
    };

    if (input.depth === "skip") {
        return { personaList: [], reason: "skipped, nothing to review" };
    }

    if (input.depth === "light") {
        const wanted = LIGHT_BY_RULE[input.rule] ?? LIGHT_DEFAULT;
        return narrow(wanted, `light review (${input.rule})`);
    }

    const answers = input.decision?.answers ?? {};
    const needsFull = answers.needs_full_review;
    if (needsFull?.type === "noul" && needsFull.value >= NEEDS_FULL_REVIEW_FLOOR) {
        return {
            personaList: input.allowedList,
            reason: `decision: needs a full review (${needsFull.value.toFixed(2)}), every enabled persona`,
        };
    }

    const risk = answers.risk_area;
    if (risk?.type === "choice" && risk.confidence >= RISK_AREA_CONFIDENCE_FLOOR) {
        const wanted = BY_RISK_AREA[risk.value];
        if (wanted === undefined) {
            return {
                personaList: input.allowedList,
                reason: `decision: unknown risk area ${risk.value}, every enabled persona`,
            };
        }
        if (wanted === null) {
            return {
                personaList: input.allowedList,
                reason: `decision: risk area code (${risk.confidence.toFixed(2)}), every enabled persona`,
            };
        }
        return narrow(wanted, `decision: risk area ${risk.value} (${risk.confidence.toFixed(2)})`);
    }

    return { personaList: input.allowedList, reason: "normal review, every enabled persona" };
}
