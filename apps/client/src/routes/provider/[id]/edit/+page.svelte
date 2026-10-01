<script lang="ts">
    import DefaultLayout from "$lib/components/layout/DefaultLayout.svelte";
    import AccessEditForm from "../../AccessEditForm.svelte";
    import type { PageProps } from "./$types";

    const { data }: PageProps = $props();
</script>

<DefaultLayout narrow title="Edit connection">
    <AccessEditForm item={data.access} modelList={data.modelList} />
</DefaultLayout>
