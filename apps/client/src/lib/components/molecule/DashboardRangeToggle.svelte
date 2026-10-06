<script lang="ts">
    import type { DashboardRange } from "@proval/types";
    import { twMerge } from "tailwind-merge";

    interface Props {
        value: DashboardRange;
        onchange: (range: DashboardRange) => void;
        class?: string;
    }

    const { value, onchange, class: className }: Props = $props();

    const options: { value: DashboardRange; label: string }[] = [
        { value: "24h", label: "24h" },
        { value: "7d", label: "7d" },
        { value: "30d", label: "30d" },
        { value: "mtd", label: "MTD" },
        { value: "year", label: "Year" },
    ];
</script>

<div
    class={twMerge("inline-flex rounded-lg border border-border bg-card p-0.5  ", className)}
    role="group"
    aria-label="Dashboard time range">
    {#each options as option (option.value)}
        <button
            type="button"
            class={twMerge(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                value === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={value === option.value}
            onclick={() => onchange(option.value)}>
            {option.label}
        </button>
    {/each}
</div>
