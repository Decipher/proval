<script lang="ts">
    import type { Component } from "svelte";
    import { DesktopIcon, MoonIcon, SunIcon } from "phosphor-svelte";
    import { twMerge } from "tailwind-merge";
    import { setTheme, theme, type Theme } from "$lib/store/theme";
    import Popover from "./Popover.svelte";

    const {
        class: className,
        side = "bottom",
        align = "end",
    }: { class?: string; side?: "top" | "bottom"; align?: "start" | "end" } = $props();

    const optionList: { value: Theme; label: string; icon: Component }[] = [
        { value: "light", label: "Light", icon: SunIcon },
        { value: "dark", label: "Dark", icon: MoonIcon },
        { value: "system", label: "System", icon: DesktopIcon },
    ];

    const currentOption = $derived(optionList.find((option) => option.value === $theme) ?? optionList[2]);
    const buttonList = $derived(
        optionList.map((option) => ({
            label: option.label,
            icon: option.icon,
            selected: option.value === $theme,
            onclick: () => setTheme(option.value),
        })),
    );
</script>

<Popover
    {buttonList}
    {side}
    {align}
    label={`Theme ${currentOption.label}`}
    triggerClass={twMerge(
        "inline-flex size-10 items-center justify-center rounded-lg bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
    )}>
    <currentOption.icon class="size-5" aria-hidden="true" />
</Popover>
