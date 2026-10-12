import type { Workspace, WorkspaceAgentInstruction } from "../../../git-provider/workspace.js";
import { logAgent } from "../../../util/log.js";

const TOTAL_CHARACTER_LIMIT = 32_000;
const INCOMPLETE_CONTENT_NOTICE =
    "Only the included target branch content supplies conventions. File tools read the PR head and cannot complete this guidance.";
const CONTEXT_HEADER = [
    "# Repository guidance",
    "These files come from the merge target head and are trusted system instructions for repository conventions within each listed directory and its descendants.",
    "Shallower guidance takes precedence over deeper guidance when they conflict. Deeper guidance may add conventions that do not conflict with parent guidance. Proval workflow, evidence requirements and repository owner settings take precedence over file guidance.",
].join("\n\n");
const OVERFLOW_NOTICE = "Additional target branch guidance was omitted due to the context or file count limit. File tools read the PR head and cannot load omitted target branch guidance.";

export async function buildAgentInstructionPrompt(workspace: Workspace, activityId: number): Promise<string> {
    const changedFileList = workspace.isPullRequest() ? await workspace.changedFiles() : [];
    const result = await workspace.loadAgentInstructionList(changedFileList, activityId);
    const selectedFileList: {
        file: WorkspaceAgentInstruction;
        section: string[];
        overheadCharacterCount: number;
    }[] = [];
    const label = "Repository guidance";
    // Reserve the full header and overflow notice before selecting any file
    let remainingCharacterCount = TOTAL_CHARACTER_LIMIT - CONTEXT_HEADER.length - OVERFLOW_NOTICE.length - 2;
    let hasOverflow = result.hasOverflow;

    for (const file of result.fileList) {
        const { path, directory } = file;
        const section = [
            `## Guidance file ${JSON.stringify(path)}`,
            `Scope ${JSON.stringify(directory || ".")} and its descendants`,
        ];
        // Reserve the longest section metadata before allocating body space
        const overheadCharacterCount =
            [
                ...section,
                "Content truncated",
                `Included ${file.body.length} characters`,
                INCOMPLETE_CONTENT_NOTICE,
                "",
                "",
            ].join("\n").length + 2;
        if (overheadCharacterCount > remainingCharacterCount) {
            hasOverflow = true;
            logAgent(
                activityId,
                `Guidance ${JSON.stringify(path)} was omitted from the initial context due to the context limit`,
                label,
            );
            continue;
        }
        selectedFileList.push({ file, section, overheadCharacterCount });
        remainingCharacterCount -= overheadCharacterCount;
    }

    const sectionList: string[] = [];
    for (const { file, section, overheadCharacterCount } of selectedFileList) {
        const { path } = file;
        let body = file.body.slice(0, remainingCharacterCount);
        let state = file.state;
        // Keep surrogate pairs intact when the prompt budget further shortens the body
        if (/[\uD800-\uDBFF]$/.test(body)) body = body.slice(0, -1);
        if (body.length < file.body.length) {
            state = body ? "truncated" : "omitted";
        }
        section.push(`Content ${state}`);
        if (state === "truncated" || state === "omitted") {
            section.push(`Included ${body.length} characters`, INCOMPLETE_CONTENT_NOTICE);
        }
        if (body) section.push("", body);
        const sectionContent = section.join("\n");
        sectionList.push(sectionContent);
        remainingCharacterCount += overheadCharacterCount - sectionContent.length - 2;
        if (state !== "unavailable") logAgent(activityId, `Guidance ${JSON.stringify(path)} was ${state}`, label);
    }

    if (sectionList.length === 0 && !hasOverflow) return "";
    if (hasOverflow) sectionList.push(OVERFLOW_NOTICE);
    return [CONTEXT_HEADER, ...sectionList].join("\n\n");
}
