<script lang="ts">
    import { twMerge } from "tailwind-merge";

    interface Props {
        value?: string;
        placeholder?: string;
        password?: boolean;
        disabled?: boolean;
        class?: string;
        onchange?: (event: Event) => void;
        name?: string;
        onkeydown?: (event: KeyboardEvent) => void;
        id?: string;
        required?: boolean;
        suggestionList?: string[];
    }

    let {
        value = $bindable(),
        placeholder,
        password,
        disabled = false,
        class: className,
        onchange,
        name,
        onkeydown,
        id,
        required,
        suggestionList,
    }: Props = $props();

    let suggestionOpen = $state(false);

    const inputClass = twMerge(
        "h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-800",
        disabled ? "cursor-not-allowed opacity-60" : "",
        className,
    );

    const filteredSuggestionList = $derived.by(() => {
        if (!suggestionList?.length) {
            return [];
        }
        const query = (value ?? "").trim().toLowerCase();
        if (!query) {
            return suggestionList;
        }
        return suggestionList.filter((item) => item.toLowerCase().includes(query));
    });

    function openSuggestionPanel() {
        if (!disabled && suggestionList?.length) {
            suggestionOpen = true;
        }
    }

    function closeSuggestionPanel() {
        suggestionOpen = false;
    }

    function pickSuggestion(item: string) {
        value = item;
        closeSuggestionPanel();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            closeSuggestionPanel();
        }
        onkeydown?.(event);
    }
</script>

{#if suggestionList?.length}
    <div class="relative">
        <input
            bind:value
            {placeholder}
            {id}
            {required}
            {disabled}
            class={inputClass}
            type={password ? "password" : "text"}
            autocomplete="off"
            {onchange}
            {name}
            onfocus={openSuggestionPanel}
            onblur={closeSuggestionPanel}
            onkeydown={handleKeydown} />
        {#if suggestionOpen && filteredSuggestionList.length > 0}
            <ul
                class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
                role="listbox">
                {#each filteredSuggestionList as item (item)}
                    <li role="presentation">
                        <button
                            type="button"
                            role="option"
                            aria-selected={value === item}
                            class="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 {value ===
                            item
                                ? 'bg-primary/10 text-neutral-900 dark:text-neutral-100'
                                : 'text-neutral-800 dark:text-neutral-200'}"
                            onmousedown={(event) => event.preventDefault()}
                            onclick={() => pickSuggestion(item)}>
                            {item}
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
{:else}
    <input
        bind:value
        {placeholder}
        {id}
        {required}
        {disabled}
        class={inputClass}
        type={password ? "password" : "text"}
        {onchange}
        {name}
        {onkeydown} />
{/if}
