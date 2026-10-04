<script lang="ts">
    import { openAlert } from "$lib/store/modal";
    import fetchApi from "$lib/utils";
    import Button from "../atom/Button.svelte";
    import InputText from "../atom/InputText.svelte";
    import FormField from "./FormField.svelte";

    interface Props {
        label: string;
        description?: string;
        placeholder: string;
        patchEndpoint: string;
        onSuccess?: () => void;
    }
    const { label, description, placeholder, patchEndpoint, onSuccess }: Props = $props();

    let value = $state("");
    let isSaving = $state(false);

    async function handleSubmit() {
        if (isSaving) return;
        const trimmed = value.trim();
        if (!trimmed) {
            await openAlert("Please enter a value");
            return;
        }
        isSaving = true;
        try {
            const response = await fetchApi(patchEndpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: trimmed }),
            });
            if (response.ok) {
                value = "";
                await openAlert("Updated successfully");
                onSuccess?.();
            } else {
                const body = await response.json().catch(() => ({}));
                await openAlert(body.error ?? "Failed to update");
            }
        } catch {
            await openAlert("Failed to update");
        } finally {
            isSaving = false;
        }
    }
</script>

<FormField {label} {description}>
    {#snippet children({ id })}
        <div class="flex items-center gap-3">
            <InputText {id} {placeholder} password class="min-w-0 flex-1" bind:value />
            <Button primary type="button" disabled={isSaving} onclick={handleSubmit}>Save</Button>
        </div>
    {/snippet}
</FormField>
