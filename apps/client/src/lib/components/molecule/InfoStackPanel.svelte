<script lang="ts" module>
    export type InfoStackItem = {
        label: string;
        value: string | number;
        error?: boolean;
        sublabel?: string;
        href?: string;
    };
</script>

<script lang="ts">
    interface Props {
        itemList: InfoStackItem[];
        sectionTitle?: string;
        class?: string;
    }

    const { itemList, sectionTitle, class: className = "" }: Props = $props();
</script>

<div class={className}>
    {#if sectionTitle}
        <div class="mb-3 pl-1">
            <h3 class="text-base font-medium text-foreground">{sectionTitle}</h3>
        </div>
    {:else}
        <div class="mb-3 pl-1" aria-hidden="true">
            <h3 class="invisible text-base font-medium">&nbsp;</h3>
        </div>
    {/if}
    <div class="rounded-lg border border-border bg-card">
        <div class="divide-y divide-border">
            {#each itemList as item (item.label)}
                {#if item.href}
                    <a
                        href={item.href}
                        class="block px-4 py-3.5 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary">
                        <p class="text-sm text-muted-foreground">{item.label}</p>
                        <div class="mt-1.5 flex items-center gap-2">
                            {#if item.error}
                                <span class="size-2 shrink-0 rounded-full bg-destructive" aria-hidden="true"></span>
                            {/if}
                            <p class="text-xl font-semibold tracking-tight text-foreground">
                                {item.value}
                            </p>
                        </div>
                        {#if item.sublabel}
                            <p class="mt-1 text-xs text-muted-foreground">{item.sublabel}</p>
                        {/if}
                    </a>
                {:else}
                    <div class="px-4 py-3.5">
                        <p class="text-sm text-muted-foreground">{item.label}</p>
                        <div class="mt-1.5 flex items-center gap-2">
                            {#if item.error}
                                <span class="size-2 shrink-0 rounded-full bg-destructive" aria-hidden="true"></span>
                            {/if}
                            <p class="text-xl font-semibold tracking-tight text-foreground">
                                {item.value}
                            </p>
                        </div>
                        {#if item.sublabel}
                            <p class="mt-1 text-xs text-muted-foreground">{item.sublabel}</p>
                        {/if}
                    </div>
                {/if}
            {/each}
        </div>
    </div>
</div>
