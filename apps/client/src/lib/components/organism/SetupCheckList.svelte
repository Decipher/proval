<script lang="ts" module>
    export type SetupStepStatus = "complete" | "current" | "pending" | "blocked";

    export type SetupStep = {
        id: string;
        title: string;
        description: string;
        href: string;
        ctaLabel: string;
        manageLabel?: string;
        complete: boolean;
        blocked?: boolean;
        blockedReason?: string;
        status: SetupStepStatus;
    };
</script>

<script lang="ts">
    import Card from "$lib/components/layout/Card.svelte";
    import Button from "$lib/components/atom/Button.svelte";
    import { CheckCircleIcon, CircleIcon, LockIcon } from "phosphor-svelte";

    interface Props {
        steps: SetupStep[];
        completedCount: number;
        totalCount: number;
    }

    const { steps, completedCount, totalCount }: Props = $props();

    const progressPercent = $derived(totalCount > 0 ? (completedCount / totalCount) * 100 : 0);
</script>

<Card border title="Get started">
    <div class="space-y-6">
        <div class="space-y-2">
            <div class="flex items-center justify-between gap-4 text-sm">
                <p class="text-secondary-foreground">Complete these steps to start automated code reviews.</p>
                <span class="shrink-0 font-medium text-foreground">
                    {completedCount} of {totalCount} complete
                </span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-border">
                <div
                    class="h-full rounded-full bg-primary transition-all duration-300"
                    style="width: {progressPercent}%">
                </div>
            </div>
        </div>

        <div class="divide-y divide-border">
            {#each steps as step (step.id)}
                <div
                    class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex min-w-0 items-start gap-3">
                        {#if step.status === "complete"}
                            <CheckCircleIcon weight="fill" class="mt-0.5 size-5 shrink-0 text-primary-text" />
                        {:else if step.status === "blocked"}
                            <LockIcon class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                        {:else}
                            <CircleIcon
                                class="mt-0.5 size-5 shrink-0 {step.status === 'current'
                                    ? 'text-primary-text'
                                    : 'text-border-strong'}" />
                        {/if}

                        <div class="min-w-0 space-y-0.5">
                            <p
                                class="text-sm font-medium {step.status === 'complete'
                                    ? 'text-muted-foreground'
                                    : 'text-foreground'}">
                                {step.title}
                            </p>
                            <p class="text-sm text-muted-foreground">
                                {step.description}
                            </p>
                            {#if step.blocked && step.blockedReason}
                                <p class="text-xs text-muted-foreground">{step.blockedReason}</p>
                            {/if}
                        </div>
                    </div>

                    <div class="shrink-0 pl-8 sm:pl-0">
                        {#if step.complete}
                            <Button text href={step.href} class="text-sm font-medium">
                                {step.manageLabel ?? "Manage →"}
                            </Button>
                        {:else if step.blocked}
                            <Button secondary disabled size="sm">
                                {step.ctaLabel}
                            </Button>
                        {:else if step.status === "current"}
                            <Button primary href={step.href} size="sm">
                                {step.ctaLabel}
                            </Button>
                        {:else}
                            <Button secondary href={step.href} size="sm">
                                {step.ctaLabel}
                            </Button>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</Card>
