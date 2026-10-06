<script lang="ts">
    import { twMerge } from "tailwind-merge";
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
        class?: string;
    }
    let { children, class: className }: Props = $props();
</script>

<th
    class={twMerge(
        "border-b border-border px-4 py-3 text-left text-sm font-medium text-secondary-foreground",
        className,
    )}>
    {@render children()}
</th>
