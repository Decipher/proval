<script lang="ts">
    import { tick, type Component, type Snippet } from "svelte";
    import { CheckIcon } from "phosphor-svelte";
    import { twMerge } from "tailwind-merge";

    interface ButtonItem {
        onclick: () => void;
        label: string;
        icon?: Component;
        selected?: boolean;
    }

    interface Props {
        buttonList: ButtonItem[];
        children: Snippet;
        label?: string;
        triggerClass?: string;
        side?: "top" | "bottom";
        align?: "start" | "end";
    }

    const { buttonList, children, label, triggerClass, side = "bottom", align = "end" }: Props = $props();

    const menuId = $props.id();
    let open = $state(false);
    let containerRef: HTMLDivElement | undefined = $state();
    let triggerRef: HTMLButtonElement | undefined = $state();
    let menuRef: HTMLDivElement | undefined = $state();

    async function openPopover(last = false) {
        open = true;
        await tick();
        if (!open) return;
        const itemList = menuRef?.querySelectorAll<HTMLButtonElement>("button");
        itemList?.[last ? itemList.length - 1 : 0]?.focus({ preventScroll: true });
    }

    function closePopover(restoreFocus = false) {
        open = false;
        if (restoreFocus) triggerRef?.focus({ preventScroll: true });
    }

    function togglePopover() {
        if (open) closePopover();
        else void openPopover();
    }

    function handleClickOutside(event: PointerEvent) {
        if (containerRef && !containerRef.contains(event.target as Node)) {
            closePopover();
        }
    }

    function handleButtonClick(item: ButtonItem) {
        item.onclick();
        closePopover(true);
    }

    function handleTriggerKeydown(event: KeyboardEvent) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            void openPopover(event.key === "ArrowUp");
        }
    }

    function handleMenuKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closePopover(true);
            return;
        }
        if (event.key === "Tab") {
            closePopover(true);
            return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

        event.preventDefault();
        const itemList = Array.from(menuRef?.querySelectorAll<HTMLButtonElement>("button") ?? []);
        if (!itemList.length) return;
        const index = itemList.findIndex((item) => item === document.activeElement);
        const nextIndex =
            event.key === "Home"
                ? 0
                : event.key === "End"
                  ? itemList.length - 1
                  : (index + (event.key === "ArrowDown" ? 1 : -1) + itemList.length) % itemList.length;
        itemList[nextIndex]?.focus({ preventScroll: true });
    }

    $effect(() => {
        if (!open) return;
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    });
</script>

<div bind:this={containerRef} class="relative inline-flex h-min">
    <button
        bind:this={triggerRef}
        id={`${menuId}-trigger`}
        type="button"
        onclick={togglePopover}
        onkeydown={handleTriggerKeydown}
        class={twMerge("h-min cursor-pointer", triggerClass)}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}>
        {@render children()}
    </button>

    {#if open}
        <div
            bind:this={menuRef}
            id={menuId}
            role="menu"
            tabindex="-1"
            aria-labelledby={`${menuId}-trigger`}
            onkeydown={handleMenuKeydown}
            class={twMerge(
                "absolute z-50 min-w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
                align === "start" ? "left-0" : "right-0",
                side === "top" ? "bottom-full mb-1" : "top-full mt-1",
            )}>
            {#each buttonList as item}
                <button
                    type="button"
                    role={item.selected === undefined ? "menuitem" : "menuitemradio"}
                    aria-checked={item.selected}
                    tabindex="-1"
                    class="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm whitespace-nowrap hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none"
                    onclick={() => handleButtonClick(item)}>
                    {#if item.icon}
                        <item.icon class="size-4 shrink-0" aria-hidden="true" />
                    {/if}
                    <span class="flex-1">{item.label}</span>
                    {#if item.selected}
                        <CheckIcon class="size-4 shrink-0" aria-hidden="true" />
                    {/if}
                </button>
            {/each}
        </div>
    {/if}
</div>
