import type { ApiTokenResponse } from "@proval/types";
import { formatValue, render, renderOne, type Column } from "../output.js";
import { maskToken } from "../config.js";
import { type CommandContext, UsageError } from "./shared.js";

const columnList: Column<ApiTokenResponse>[] = [
    { header: "id", value: (r) => String(r.id), numeric: true },
    { header: "name", value: (r) => r.name },
    { header: "prefix", value: (r) => r.tokenPrefix },
    { header: "scopes", value: (r) => r.scopeList.join(",") },
    { header: "last used", value: (r) => formatValue(r.lastUsedAt) },
];

export async function runTokenCommand(context: CommandContext): Promise<void> {
    const [verb, reference] = context.argumentList;

    if (!verb || verb === "list") {
        const list = await context.client.get<ApiTokenResponse[]>("/api-token");
        context.write(render(context.mode, list, columnList));
        return;
    }

    if (verb === "revoke") {
        if (!reference) throw new UsageError("proval token revoke <id>");
        const id = Number.parseInt(reference, 10);
        if (!Number.isInteger(id)) throw new UsageError(`expected a token id, got ${reference}`);
        await context.client.delete(`/api-token/${id}`);
        context.write(renderOne(context.mode, { id, status: "revoked" }));
        return;
    }

    if (verb === "create") {
        // Deliberately not implemented against the API here: token management
        // requires a session login by design, so that a token cannot mint
        // another token. Say so rather than failing with a 403.
        throw new UsageError(
            "Creating a token needs a session login, because a token may not mint another token. " +
                "Create it in the dashboard under Settings, then 'proval auth login' with it.",
        );
    }

    throw new UsageError(`unknown command: token ${verb}`);
}

export function describeStoredToken(token: string): string {
    return maskToken(token);
}
