import { timingSafeEqual } from "node:crypto";
import { Webhook } from "standardwebhooks";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { decrypt } from "../../util/encrypt.js";
import { GitLabProvider } from "../../git-provider/gitlab.js";
import { GitLabAccessService } from "../../api/access/access.service.js";
import { fetchWebhookContextRow, originFromWebhookUrl } from "../load-repository.middleware.js";

const accessService = new GitLabAccessService();

function verifyGitlabToken(secret: string, tokenHeader: string | undefined): boolean {
    if (!secret || !tokenHeader) {
        return false;
    }
    const expected = Buffer.from(secret, "utf8");
    const received = Buffer.from(tokenHeader, "utf8");
    if (expected.length !== received.length) {
        return false;
    }
    return timingSafeEqual(expected, received);
}

function verifyGitLabCredential(c: Context, secret: string | null, signingToken: string | null): boolean {
    const signature = c.req.header("webhook-signature");
    if (signature !== undefined) {
        if (!signingToken) return false;
        try {
            new Webhook(decrypt(signingToken).trim()).verify(c.get("gitlabWebhookRawBody") as string, {
                "webhook-id": c.req.header("webhook-id") ?? "",
                "webhook-timestamp": c.req.header("webhook-timestamp") ?? "",
                "webhook-signature": signature,
            });
            return true;
        } catch {
            return false;
        }
    }
    return secret !== null && verifyGitlabToken(decrypt(secret).trim(), c.req.header("X-Gitlab-Token"));
}

type GitLabWebhookPayload = {
    project?: {
        id?: number;
        path_with_namespace?: string;
        description?: string | null;
        web_url?: string;
    };
};

export const parseGitLabWebhook = createMiddleware(async (c, next) => {
    const rawBody = await c.req.text();
    let payload: GitLabWebhookPayload;
    try {
        payload = JSON.parse(rawBody) as GitLabWebhookPayload;
    } catch {
        return c.json({ error: "Invalid JSON body" }, 400);
    }
    const projectId = payload?.project?.id;
    if (projectId === undefined) {
        return c.json({ error: "Missing project in payload" }, 400);
    }

    c.set("gitlabWebhookRawBody", rawBody);
    c.set("gitlabPayload", payload);
    await next();
});

export const verifyGitLabWebhook = createMiddleware(async (c, next) => {
    const payload = c.get("gitlabPayload") as GitLabWebhookPayload;
    const projectId = payload.project?.id;
    if (projectId === undefined) {
        return c.json({ error: "Missing project in payload" }, 400);
    }

    const existing = await fetchWebhookContextRow(projectId, "gitlab");
    if (existing) {
        const { repository } = existing;

        if (!verifyGitLabCredential(c, repository.webhookSecret, repository.webhookSigningToken)) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        c.set("webhookRepositoryRow", existing);
        await next();
        return;
    }

    const instanceHeader = c.req.header("X-Gitlab-Instance");
    const instanceBaseUrl = instanceHeader?.trim() || originFromWebhookUrl(payload.project?.web_url ?? "");
    if (!instanceBaseUrl) {
        return c.json({ error: "Repository not found" }, 404);
    }

    const access = await accessService.findForAutoCreate("gitlab", instanceBaseUrl);
    if (!access) {
        return c.json({ error: "Repository not found" }, 404);
    }

    if (!verifyGitLabCredential(c, access.defaultWebhookSecret, access.defaultWebhookSigningToken)) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const path = payload.project?.path_with_namespace?.trim();
    if (!path) {
        return c.json({ error: "Repository not found" }, 404);
    }

    const personalAccessToken = decrypt(access.accessToken);
    const gitlab = new GitLabProvider(access.baseUrl, personalAccessToken, projectId);
    const isMaintainer = await gitlab.isConnectedAccountProjectMaintainer();
    if (!isMaintainer) {
        return c.json({ error: "Repository not found" }, 404);
    }

    c.set("webhookRepositoryCreate", {
        access,
        provider: "gitlab",
        gitProviderRepositoryId: projectId,
        path,
        description: payload.project?.description ?? null,
    });

    await next();
});
