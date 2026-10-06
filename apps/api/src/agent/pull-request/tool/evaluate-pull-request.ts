import type { AgentTool } from "../../llm/loop.js";
import type { GitProvider } from "../../../git-provider/types.js";

export function evaluatePullRequestTool(provider: GitProvider, prIid: number): AgentTool {
    return {
        name: "evaluate_pull_request",
        description:
            "Record your overall verdict on this first review after post_pull_request_comment. Call exactly once. Set isGood true only when you published no Main Issues (no inline comments and no critical or problem items in the summary). Set isGood false when any Main Issue was published.",
        parameters: {
            type: "object",
            properties: {
                isGood: {
                    type: "boolean",
                    description:
                        "True when this review has no Main Issues. False when you posted inline Main Issues or listed Main Issues in the summary.",
                },
            },
            required: ["isGood"],
        },
        execute: async (args) => {
            const isGood = args.isGood === true;
            if (isGood) {
                await provider.addEmoji({ type: "pull_request", prIid }, "👍");
            }
            return { evaluated: true, isGood };
        },
    };
}
