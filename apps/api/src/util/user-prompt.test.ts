import { describe, expect, it } from "bun:test";
import { generateUserPrompt } from "./user-prompt.js";

describe("generateUserPrompt", () => {
    it("returns null when body is empty or whitespace", () => {
        expect(generateUserPrompt("header", null)).toBe(null);
        expect(generateUserPrompt("header", "")).toBe(null);
        expect(generateUserPrompt("header", "   ")).toBe(null);
    });

    it("joins header and trimmed body", () => {
        expect(generateUserPrompt("header", "  hello  ")).toBe("header\n\nhello");
    });
});
