<script lang="ts">
    import AlternativeCompare from "../../../lib/components/AlternativeCompare.svelte";
    import SeoHead from "../../../lib/components/SeoHead.svelte";
    import { breadcrumbLd, comparisonPageLd, faqPageLd } from "../../../lib/seo";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    const { competitor } = $derived(data);
    const path = $derived(`/alternatives/${competitor.slug}`);
    const jsonLd = $derived.by(() => {
        const blockList: unknown[] = [
            breadcrumbLd([
                { name: "Home", path: "/" },
                { name: "Alternatives", path: "/alternatives" },
                { name: competitor.name, path },
            ]),
            comparisonPageLd({
                name: competitor.title,
                description: competitor.description,
                path,
                competitor: competitor.name,
            }),
        ];
        if (competitor.faqList?.length) {
            blockList.push(faqPageLd(competitor.faqList));
        }
        return blockList;
    });
</script>

<SeoHead
    title={competitor.title}
    description={competitor.description}
    {path}
    ogImagePath={competitor.ogImagePath}
    ogImageAlt={`Proval vs ${competitor.name}`}
    {jsonLd} />

<AlternativeCompare {competitor} />
