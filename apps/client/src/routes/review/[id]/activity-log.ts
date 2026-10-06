import type { ActivityLogEntry, ToolResultLogEntry } from "@proval/types";

export interface ActivityLogRow {
    key: number;
    entry: Exclude<ActivityLogEntry, ToolResultLogEntry>;
    result?: ToolResultLogEntry;
}

export function serializeActivityLogList(logList: readonly ActivityLogEntry[]): ActivityLogRow[] {
    const resultByCallId = new Map<string, ToolResultLogEntry>();
    for (const entry of logList) {
        if (entry.type === "tool-result") {
            resultByCallId.set(entry.toolCallId, entry);
        }
    }

    const rowList: ActivityLogRow[] = [];
    for (const [index, entry] of logList.entries()) {
        if (entry.type === "tool-result") continue;

        const result = entry.type === "tool-call" ? resultByCallId.get(entry.toolCallId) : undefined;
        rowList.push({
            key: index,
            entry,
            result: entry.type === "tool-call" && result?.toolName === entry.toolName ? result : undefined,
        });
    }
    return rowList;
}
