import type { ReasoningEffort } from "@proval/types";
import type { LlmSender } from "./loop.js";
import { createOpenAiSender } from "./openai.js";
import { createOpenAiResponsesSender } from "./openai-responses.js";
import { createAnthropicSender } from "./anthropic.js";
import { createXaiSender, type XaiSenderConfig } from "./xai.js";
import { loadLimiter, type Limiter } from "./concurrency.js";

export interface SenderSDKConfig {
    apiKey: string;
    baseURL: string;
    model: string;
    timeoutSecond: number;
    maxOutputToken?: number;
    reasoningEffort?: ReasoningEffort;
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    maxRetries?: number;
}

export type SenderConfig = (
    | (Omit<SenderSDKConfig, "fetch"> & {
          provider: "openai" | "openai_responses" | "anthropic";
          fetch?: SenderSDKConfig["fetch"];
      })
    | (XaiSenderConfig & { provider: "xai" })
) & {
    modelProviderId?: number;
    concurrency?: number | null;
};

// Bun applies a socket idle limit that fires while a slow model is still thinking.
// Disable it and let the SDK deadline own the timeout.
function createLLMFetch() {
    const sessionId = crypto.randomUUID();
    return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const headers = new Headers(init?.headers ?? {});
        headers.set("x-opencode-session", sessionId);
        headers.set("User-Agent", "Proval");
        return fetch(input, { ...init, timeout: false, headers } as RequestInit);
    };
}

function withConcurrencyLimit(sender: LlmSender, limiter: Limiter): LlmSender {
    return {
        send: (messages, tools) => limiter.run(() => sender.send(messages, tools)),
        getModel: () => sender.getModel(),
    };
}

export function createSender(config: SenderConfig): LlmSender {
    const { modelProviderId, concurrency, ...sdkConfig } = config;
    const limiter = loadLimiter(modelProviderId, concurrency);
    if (sdkConfig.provider === "xai") return withConcurrencyLimit(createXaiSender(sdkConfig), limiter);

    const fetch = sdkConfig.fetch ?? createLLMFetch();
    switch (sdkConfig.provider) {
        case "openai_responses":
            return withConcurrencyLimit(createOpenAiResponsesSender({ ...sdkConfig, fetch }), limiter);
        case "anthropic":
            return withConcurrencyLimit(createAnthropicSender({ ...sdkConfig, fetch }), limiter);
        case "openai":
        default:
            return withConcurrencyLimit(createOpenAiSender({ ...sdkConfig, fetch }), limiter);
    }
}
