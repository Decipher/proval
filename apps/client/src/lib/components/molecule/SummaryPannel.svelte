<script lang="ts" module>
    export type SummaryStatus = "ok" | "error" | "neutral";
</script>

<script lang="ts">
    interface Props {
        label: string;
        value: string | number;
        sublabel?: string;
        href?: string;
        actionLabel?: string;
        navHref?: string;
        status?: SummaryStatus;
    }

    const { label, value, sublabel, href, actionLabel, navHref, status }: Props = $props();

    const statusDotClass: Record<SummaryStatus, string> = {
        ok: "bg-success",
        error: "bg-destructive",
        neutral: "bg-border-strong",
    };

    const cardClass = "rounded-lg border border-border bg-card p-4  ";
    const navLinkClass = `${cardClass} block transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary `;
</script>

{#snippet cardBody()}
    <p class="text-sm text-muted-foreground">{label}</p>

    <div class="mt-2 flex items-center gap-2">
        {#if status}
            <span class="size-2 shrink-0 rounded-full {statusDotClass[status]}" aria-hidden="true"></span>
        {/if}
        <p class="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>

    {#if sublabel}
        <p class="mt-1 text-xs text-muted-foreground">{sublabel}</p>
    {/if}

    {#if href && actionLabel}
        <a
            {href}
            class="mt-3 inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {actionLabel}
        </a>
    {/if}
{/snippet}

{#if navHref}
    <a href={navHref} class={navLinkClass}>
        {@render cardBody()}
    </a>
{:else}
    <div class={cardClass}>
        {@render cardBody()}
    </div>
{/if}
