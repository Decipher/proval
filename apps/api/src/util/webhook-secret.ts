import { Webhook } from "standardwebhooks";

export class WebhookCredentialError extends Error {}

export function normalizeWebhookSecret(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function normalizeWebhookSigningToken(value: unknown): string | null {
    if (value === undefined || value === null || value === "") return null;
    const token = normalizeWebhookSecret(value);
    if (!token && typeof value === "string") return null;
    if (!token?.startsWith("whsec_")) {
        throw new WebhookCredentialError("Signing token must start with whsec_ and contain a valid Base64 key");
    }
    try {
        new Webhook(token);
    } catch {
        throw new WebhookCredentialError("Signing token must contain a valid Base64 key");
    }
    return token;
}
