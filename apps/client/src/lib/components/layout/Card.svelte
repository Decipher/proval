<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
        border?: boolean;
        title?: string;
        spaceY?: boolean;
    }
    let { children, border = false, title, spaceY = false }: Props = $props();
</script>

<div>
    {#if title}
        <div class="mb-3 pl-1">
            <h3 class="text-base font-medium text-foreground">{title}</h3>
        </div>
    {/if}
    <div
        class="rounded-lg {spaceY ? 'space-y-6' : ''} {border
            ? 'border'
            : 'border-none'} border-border bg-card px-6 py-5 text-card-foreground">
        {@render children()}
    </div>
</div>
