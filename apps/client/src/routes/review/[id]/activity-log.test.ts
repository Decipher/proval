import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { CommonLogEntry, ToolCallLogEntry, ToolErrorLogEntry, ToolResultLogEntry } from "@proval/types";
import { serializeActivityLogList } from "./activity-log.js";

const common: CommonLogEntry = {
    type: "common",
    timestamp: "2026-10-06T10:00:00.000Z",
    level: "info",
    label: "Plan",
    message: "Starting review",
};

function toolCall(toolCallId: string, label = "Plan"): ToolCallLogEntry {
    return { ...common, type: "tool-call", toolName: "get_file_diff", toolCallId, label, message: '{"path":"app.ts"}' };
}

function toolResult(call: ToolCallLogEntry): ToolResultLogEntry {
    return { ...call, type: "tool-result", message: `Result for ${call.toolCallId}` };
}

describe("serializeActivityLogList", () => {
    test("pairs concurrent calls by execution ID and keeps call order before label filtering", () => {
        const first = toolCall("first", "Unit 1");
        const second = toolCall("second", "Unit 2");
        const firstResult = toolResult(first);
        const secondResult = toolResult(second);
        const rowList = serializeActivityLogList([common, first, second, secondResult, common, firstResult]);

        assert.deepEqual(
            rowList.map((row) => row.entry),
            [common, first, second, common],
        );
        assert.deepEqual(
            rowList.map((row) => row.key),
            [0, 1, 2, 4],
        );
        assert.equal(rowList[1]?.result, firstResult);
        assert.equal(rowList[2]?.result, secondResult);
        assert.equal(rowList.filter((row) => row.entry.label === "Unit 2")[0]?.result, secondResult);
    });

    test("pairs results even when they precede the call in the response", () => {
        const call = toolCall("first");
        const result = toolResult(call);
        assert.deepEqual(serializeActivityLogList([result, call]), [{ key: 1, entry: call, result }]);
    });

    test("keeps row identity when a pending call receives its result on the next poll", () => {
        const call = Object.freeze(toolCall("pending"));
        const initialLogList = Object.freeze([common, call]);
        const initialRowList = serializeActivityLogList(initialLogList);
        const result = toolResult(call);
        const nextRowList = serializeActivityLogList([...initialLogList, result]);

        assert.equal(initialRowList[1]?.result, undefined);
        assert.equal(nextRowList[1]?.key, initialRowList[1]?.key);
        assert.equal(nextRowList[1]?.result, result);
        assert.equal(Object.hasOwn(call, "result"), false);
    });

    test("keeps tool errors as independent rows without attaching them as results", () => {
        const call = toolCall("failed");
        const error: ToolErrorLogEntry = { ...call, type: "tool-error", level: "error", message: "Tool failed" };
        const rowList = serializeActivityLogList([call, error, common]);

        assert.deepEqual(
            rowList.map((row) => row.entry),
            [call, error, common],
        );
        assert.equal(
            rowList.every((row) => row.result === undefined),
            true,
        );
    });

    test("only displays results under a matching call", () => {
        const call = toolCall("first");
        const wrongTool = { ...toolResult(call), toolName: "get_file_content" };
        const orphan = toolResult(toolCall("missing"));
        const rowList = serializeActivityLogList([call, wrongTool, orphan]);

        assert.deepEqual(rowList, [{ key: 0, entry: call, result: undefined }]);
        assert.deepEqual(serializeActivityLogList([]), []);
    });
});
