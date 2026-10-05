import { get, writable } from "svelte/store";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "proval.theme";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

function parseTheme(value: string | null): Theme {
    return value === "light" || value === "dark" ? value : "system";
}

function readTheme(): Theme {
    try {
        return parseTheme(window.localStorage.getItem(STORAGE_KEY));
    } catch {
        return "system";
    }
}

const themeState = writable<Theme>(readTheme());

export const theme = { subscribe: themeState.subscribe };

function applyTheme(value: Theme) {
    const dark = value === "dark" || (value === "system" && window.matchMedia(SYSTEM_QUERY).matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function setTheme(value: Theme) {
    themeState.set(value);
    applyTheme(value);

    try {
        window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
        // Keep the selected theme for this session when storage is unavailable
    }
}

export function initializeTheme() {
    const media = window.matchMedia(SYSTEM_QUERY);

    function onSystemChange() {
        if (get(themeState) === "system") applyTheme("system");
    }

    function onStorage(event: StorageEvent) {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        if (event.storageArea !== window.localStorage) return;

        const value = parseTheme(event.newValue);
        themeState.set(value);
        applyTheme(value);
    }

    const value = readTheme();
    themeState.set(value);
    applyTheme(value);
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);

    return () => {
        media.removeEventListener("change", onSystemChange);
        window.removeEventListener("storage", onStorage);
    };
}
