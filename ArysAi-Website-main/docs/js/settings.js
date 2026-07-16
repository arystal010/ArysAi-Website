// frontend/js/settings.js
//
// Settings manager — persists user preferences in localStorage.

const STORAGE_KEY = "arys_ai_settings";

export const SETTINGS_DEFAULTS = {
    enableWebSearch: true,
    enableAutoSearch: true,
    maxSearchResults: 6,
    cacheDuration: 300,
    showSearchIndicator: true
};

let current = { ...SETTINGS_DEFAULTS };

/**
 * Load settings from localStorage (or defaults).
 */
export function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            current = { ...SETTINGS_DEFAULTS, ...parsed };
        }
    } catch {
        current = { ...SETTINGS_DEFAULTS };
    }
    return { ...current };
}

/**
 * Get the current settings object.
 */
export function getSettings() {
    return { ...current };
}

/**
 * Update a single setting and persist.
 */
export function updateSetting(key, value) {
    current[key] = value;
    persist();
    return { ...current };
}

/**
 * Replace all settings and persist.
 */
export function setSettings(settings) {
    current = { ...SETTINGS_DEFAULTS, ...settings };
    persist();
    return { ...current };
}

/**
 * Reset to defaults.
 */
export function resetSettings() {
    current = { ...SETTINGS_DEFAULTS };
    persist();
    return { ...current };
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
        // Ignore storage errors (private mode, etc.)
    }
}