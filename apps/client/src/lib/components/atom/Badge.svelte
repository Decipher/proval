<script lang="ts" module>
    export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "primary";
</script>

<script lang="ts">
    import type { Snippet } from "svelte";
    import { twMerge } from "tailwind-merge";

    interface Props {
        variant?: BadgeVariant;
        class?: string;
        children: Snippet;
    }

    const { variant = "neutral", class: className, children }: Props = $props();

    const variantClass: Record<BadgeVariant, string> = {
        neutral: "bg-muted text-secondary-foreground",
        success: "bg-success-muted text-success",
        warning: "bg-warning-muted text-warning",
        danger: "bg-destructive-muted text-destructive",
        primary: "bg-primary/10 text-primary-text",
    };
</script>

<span
    class={twMerge(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        variantClass[variant],
        className,
    )}>
    {@render children()}
</span>
