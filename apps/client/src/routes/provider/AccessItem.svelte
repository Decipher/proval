<script lang="ts">
    import Button from "$lib/components/atom/Button.svelte";
    import GitProviderIcon from "$lib/components/atom/GitProviderIcon.svelte";
    import { GearIcon, TrashIcon } from "phosphor-svelte";
    import type { AccessResponse } from "@proval/types";

    type TestResult = { id: number; success: boolean; message: string };

    const iconButtonClass =
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700";

    let {
        item,
        testResult,
        isTesting,
        onTest,
        onUpdateToken,
        onDelete,
    }: {
        item: AccessResponse;
        testResult: TestResult | null;
        isTesting: boolean;
        onTest: () => void;
        onUpdateToken: () => void;
        onDelete: () => void;
    } = $props();
</script>

<div class="py-4 first:pt-0 last:pb-0">
    <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
            <GitProviderIcon provider={item.provider} boxed />
            <div class="min-w-0">
                <div class="flex items-center gap-2">
                    <p class="truncate font-medium text-neutral-800 dark:text-neutral-100">
                        {item.name}
                    </p>
                </div>
                <p class="truncate text-sm text-neutral-500">
                    {item.baseUrl}
                </p>
            </div>
        </div>
        <div class="flex shrink-0 items-center gap-1">
            <a
                href="/provider/{item.id}/edit"
                class={iconButtonClass}
                aria-label="Connection settings">
                <GearIcon class="size-4" />
            </a>
            <button
                type="button"
                class="{iconButtonClass} hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                aria-label="Delete connection"
                onclick={onDelete}>
                <TrashIcon class="size-4" />
            </button>
        </div>
    </div>
    <div class="mt-2 flex justify-end gap-2">
        <Button text size="sm" onclick={onTest} disabled={isTesting}>
            {isTesting ? "Testing..." : "Test Connection"}
        </Button>
        <Button text size="sm" onclick={onUpdateToken}>Update Access Token</Button>
    </div>
    {#if testResult && testResult.id === item.id}
        <div
            class="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm {testResult.success
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'}">
            <span class="font-medium">{testResult.success ? "Connected" : "Failed"}:</span>
            {testResult.message}
        </div>
    {/if}
</div>
