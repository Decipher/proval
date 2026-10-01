import { createHmac, timingSafeEqual } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { decrypt } from "../../util/encrypt.js";
import { log } from "../../util/log.js";
import { ForgejoProvider } from "../../git-provider/forgejo.js";
import { GitLabAccessService } from "../../api/access/access.service.js";
import { fetchWebhookContextRow, originFromWebhookUrl } from "../load-repository.middleware.js";

const accessService = new GitLabAccessService();

function verifyForgejoSignature(secret: string, rawBody: string, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) {
        return false;
    }
    let receivedBuf: Buffer;
    try {
        receivedBuf = Buffer.from(signatureHeader, "hex");
    } catch {
        return false;
    }
    const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest();
    if (receivedBuf.length !== digest.length) {
        return false;
    }
    return timingSafeEqual(receivedBuf, digest);
}

type ForgejoWebhookPayload = {
    repository?: {
        id: number;
        full_name?: string;
        description?: string | null;
        html_url?: string;
    } | null;
};

function parseOwnerRepo(fullName: string): { owner: string; repo: string } | null {
    const slashIndex = fullName.indexOf("/");
    if (slashIndex <= 0 || slashIndex === fullName.length - 1) {
        return null;
    }
    return {
        owner: fullName.slice(0, slashIndex),
        repo: fullName.slice(slashIndex + 1),
    };
}

export const parseForgejoWebhook = createMiddleware(async (c, next) => {
    const rawBody = await c.req.raw.text();

    let payload: ForgejoWebhookPayload;
    try {
        payload = JSON.parse(rawBody) as ForgejoWebhookPayload;
    } catch {
        return c.json({ error: "Invalid JSON body" }, 400);
    }

    const repositoryId = payload.repository?.id;
    if (repositoryId === undefined) {
        return c.json({ error: "Missing repository in payload" }, 400);
    }

    c.set("forgejoWebhookRawBody", rawBody);
    c.set("forgejoPayload", payload);
    await next();
});

export const verifyForgejoWebhook = createMiddleware(async (c, next) => {
    const payload = c.get("forgejoPayload") as ForgejoWebhookPayload;
    const rawBody = c.get("forgejoWebhookRawBody") as string;
    const repositoryId = payload.repository?.id;
    if (repositoryId === undefined) {
        return c.json({ error: "Missing repository in payload" }, 400);
    }

    const signature = c.req.header("X-Forgejo-Signature") ?? c.req.header("X-Gitea-Signature");

    const existing = await fetchWebhookContextRow(repositoryId, "forgejo");
    if (existing) {
        const { repository } = existing;

        const secret = decrypt(repository.webhookSecret).trim();
        if (!secret) {
            log("Webhook secret not configured", "Forgejo");
            return c.json({ error: "Webhook secret not configured" }, 401);
        }
        if (!verifyForgejoSignature(secret, rawBody, signature)) {
            log("Invalid webhook signature", "Forgejo");
            return c.json({ error: "Invalid webhook signature" }, 401);
        }

        c.set("webhookRepositoryRow", existing);
        await next();
        return;
    }

    const instanceBaseUrl = originFromWebhookUrl(payload.repository?.html_url ?? "");
    if (!instanceBaseUrl) {
        return c.json({ error: "Repository not found" }, 404);
    }

    const access = await accessService.findForAutoCreate("forgejo", instanceBaseUrl);
    if (!access) {
        return c.json({ error: "Repository not found" }, 404);
    }

    const defaultWebhookSecret = decrypt(access.defaultWebhookSecret!).trim();
    if (!verifyForgejoSignature(defaultWebhookSecret, rawBody, signature)) {
        log("Invalid webhook signature", "Forgejo");
        return c.json({ error: "Invalid webhook signature" }, 401);
    }

    const fullName = payload.repository?.full_name?.trim();
    if (!fullName) {
        return c.json({ error: "Repository not found" }, 404);
    }
    const ownerRepo = parseOwnerRepo(fullName);
    if (!ownerRepo) {
        return c.json({ error: "Repository not found" }, 404);
    }

    const personalAccessToken = decrypt(access.accessToken);
    const forgejo = new ForgejoProvider(
        access.baseUrl,
        personalAccessToken,
        ownerRepo.owner,
        ownerRepo.repo,
        repositoryId,
    );
    const isCollaborator = await forgejo.isConnectedAccountCollaborator();
    if (!isCollaborator) {
        return c.json({ error: "Repository not found" }, 404);
    }

    c.set("webhookRepositoryCreate", {
        access,
        provider: "forgejo",
        gitProviderRepositoryId: repositoryId,
        path: fullName,
        description: payload.repository?.description ?? null,
    });

    await next();
});
