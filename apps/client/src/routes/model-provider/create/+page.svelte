<script lang="ts">
    import { goto } from "$app/navigation";
    import Button from "$lib/components/atom/Button.svelte";
    import ToggleButton from "$lib/components/atom/ToggleButton.svelte";
    import DefaultLayout from "$lib/components/layout/DefaultLayout.svelte";
    import { KeyIcon } from "phosphor-svelte";

    let selected = $state<"api-key" | "xai" | null>(null);

    function continueToForm() {
        if (selected === "api-key") void goto("/model-provider/create/api-key");
        if (selected === "xai") void goto("/model-provider/create/xai");
    }
</script>

{#snippet keyIcon()}
    <KeyIcon class="size-6" aria-hidden="true" />
{/snippet}

{#snippet xaiIcon()}
    <svg class="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path
            d="M6.469 8.776L16.512 23h-4.464L2.005 8.776H6.47zm-.004 7.9l2.233 3.164L6.467 23H2l4.465-6.324zM22 2.582V23h-3.659V7.764L22 2.582zM22 1l-9.952 14.095-2.233-3.163L17.533 1H22z" />
    </svg>
{/snippet}

<DefaultLayout narrow title="Add Model Provider">
    <div class="space-y-8">
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group">
            <ToggleButton
                class="aspect-auto h-full min-h-32 w-full sm:aspect-square"
                label="API Key"
                description="OpenAI compatible or Anthropic"
                children={keyIcon}
                selected={selected === "api-key"}
                onclick={() => (selected = "api-key")} />
            <ToggleButton
                class="aspect-auto h-full min-h-32 w-full sm:aspect-square"
                label="xAI"
                description="Connect an xAI account"
                children={xaiIcon}
                selected={selected === "xai"}
                onclick={() => (selected = "xai")} />
        </div>
        <Button primary disabled={selected === null} onclick={continueToForm}>Continue</Button>
    </div>
</DefaultLayout>
