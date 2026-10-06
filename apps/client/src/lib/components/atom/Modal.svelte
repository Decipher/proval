<script lang="ts">
    import type { Snippet } from "svelte";
    import { twMerge } from "tailwind-merge";

    interface Props {
        open: boolean;
        onclose?: () => void;
        closeOnOverlayClick?: boolean;
        class?: string;
        children: Snippet;
    }

    let { open = $bindable(false), onclose, closeOnOverlayClick = true, class: className, children }: Props = $props();

    let dialogEl: HTMLDialogElement;
    let isOverlayClick = false;

    function handleClose() {
        open = false;
        onclose?.();
    }

    $effect(() => {
        if (!dialogEl) return;
        if (open && !dialogEl.open) {
            dialogEl.showModal();
        } else if (!open && dialogEl.open) {
            dialogEl.close();
        }
    });
</script>

<dialog
    bind:this={dialogEl}
    oncancel={(e) => {
        e.preventDefault();
        handleClose();
    }}
    onpointerdown={(e) => {
        isOverlayClick = e.button === 0 && e.target === dialogEl;
    }}
    onpointerup={(e) => {
        isOverlayClick = isOverlayClick && e.target === dialogEl;
    }}
    onpointercancel={() => {
        isOverlayClick = false;
    }}
    onclick={(e) => {
        const shouldClose = closeOnOverlayClick && isOverlayClick && e.target === dialogEl;
        isOverlayClick = false;
        if (shouldClose) {
            handleClose();
        }
    }}>
    <div class={twMerge("w-full max-w-sm rounded-xl bg-popover p-6 text-popover-foreground shadow-lg", className)}>
        {@render children()}
    </div>
</dialog>

<style>
    dialog {
        border: none;
        background: transparent;
        padding: 1rem;
        margin: 0;
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
    }

    dialog[open] {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    dialog::backdrop {
        background: color-mix(in srgb, var(--overlay) 50%, transparent);
    }
</style>
