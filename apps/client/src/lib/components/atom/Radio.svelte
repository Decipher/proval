<script lang="ts" generics="Value extends string = string">
    import { twMerge } from "tailwind-merge";

    interface Props {
        group?: Value;
        value: Value;
        label: string;
        name?: string;
        disabled?: boolean;
        class?: string;
    }

    let { group = $bindable("" as Value), value, label, name, disabled = false, class: className }: Props = $props();
</script>

<label
    class={twMerge(
        "inline-flex cursor-pointer items-center gap-2.5",
        disabled ? "cursor-not-allowed opacity-60" : "",
        className,
    )}>
    <span class="relative inline-flex h-5 w-5 shrink-0">
        <input
            type="radio"
            class="peer sr-only"
            {name}
            {value}
            {disabled}
            bind:group={group} />
        <span
            class="pointer-events-none absolute inset-0 rounded-full border-2 border-neutral-300 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-neutral-50 peer-checked:border-primary dark:border-neutral-600 dark:peer-focus-visible:ring-offset-neutral-900"
            aria-hidden="true"></span>
        <span
            class="pointer-events-none absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-primary opacity-0 transition-opacity peer-checked:opacity-100"
            aria-hidden="true"></span>
    </span>
    <span class="text-sm text-neutral-800 dark:text-neutral-200">{label}</span>
</label>
