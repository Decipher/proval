<script lang="ts">
    import GitProviderIcon from "$lib/components/atom/GitProviderIcon.svelte";
    import { TrashIcon } from "phosphor-svelte";
    import type { GitHubInstallationResponse } from "@proval/types";

    let {
        installation,
        onDelete,
    }: {
        installation: GitHubInstallationResponse;
        onDelete: () => void;
    } = $props();
</script>

<div class="flex items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
    <div class="flex min-w-0 items-center gap-3">
        <GitProviderIcon provider="github" boxed />
        <div class="min-w-0">
            <p class="truncate font-medium text-foreground">
                {installation.accountName || `Account #${installation.installationId}`}
            </p>
            <p class="truncate text-sm text-muted-foreground">
                {installation.accountType}
            </p>
        </div>
    </div>
    <button
        class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive-muted hover:text-destructive"
        onclick={onDelete}>
        <TrashIcon class="size-4" />
    </button>
</div>
