import { timingSafeEqual } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { decrypt } from "../../util/encrypt.js";
import { GitLabProvider } from "../../git-provider/gitlab.js";
import { GitLabAccessService } from "../../api/access/access.service.js";
import { fetchWebhookContextRow, originFromWebhookUrl } from "../load-repository.middleware.js";

const accessService = new GitLabAccessService();

function verifyGitlabToken(secret: string, tokenHeader: string | undefined): boolean {
    if (!tokenHeader) {
        return false;
    }
    const expected = Buffer.from(secret, "utf8");
    const received = Buffer.from(tokenHeader, "utf8");
    if (expected.length !== received.length) {
        return false;
    }
    return timingSafeEqual(expected, received);
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
    const payload = (await c.req.json()) as GitLabWebhookPayload;
    const projectId = payload.project?.id;
    if (projectId === undefined) {
        return c.json({ error: "Missing project in payload" }, 400);
    }

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

        const secret = decrypt(repository.webhookSecret).trim();
        if (!secret) {
            return c.json({ error: "Webhook secret not configured" }, 401);
        }
        if (!verifyGitlabToken(secret, c.req.header("X-Gitlab-Token"))) {
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

    const defaultWebhookSecret = decrypt(access.defaultWebhookSecret!).trim();
    if (!verifyGitlabToken(defaultWebhookSecret, c.req.header("X-Gitlab-Token"))) {
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
