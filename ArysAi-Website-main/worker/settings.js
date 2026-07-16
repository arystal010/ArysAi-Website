// worker/settings.js
//
// Server-side settings defaults and validation.

export const SETTINGS_DEFAULTS = {
    enableWebSearch: true,
    enableAutoSearch: true,
    maxSearchResults: 6,
    cacheDuration: 300,
    showSearchIndicator: true
};

const ALLOWED_KEYS = new Set(Object.keys(SETTINGS_DEFAULTS));

/**
 * Validate and sanitize settings from the client.
 *
 * @param {object} raw - Raw settings object from request body.
 * @returns {object} Validated settings with defaults applied for missing values.
 */
export function validateSettings(raw) {
    if (!raw || typeof raw !== "object") {
        return { ...SETTINGS_DEFAULTS };
    }

    const result = {};

    for (const key of ALLOWED_KEYS) {
        const value = raw[key];
        const defaultValue = SETTINGS_DEFAULTS[key];

        switch (typeof defaultValue) {
            case "boolean":
                result[key] = typeof value === "boolean" ? value : defaultValue;
                break;
            case "number":
                result[key] = typeof value === "number" && !Number.isNaN(value) ? value : defaultValue;
                break;
            default:
                result[key] = defaultValue;
                break;
        }
    }

    // Clamp numeric values.
    result.maxSearchResults = Math.max(5, Math.min(8, result.maxSearchResults));
    result.cacheDuration = Math.max(60, Math.min(3600, result.cacheDuration));

    return result;
}

/**
 * Get settings from the request body, applying defaults for missing fields.
 *
 * @param {object} body - Parsed JSON body from the client.
 * @returns {object} Full settings object.
 */
export function getSettingsFromBody(body) {
    if (!body || typeof body !== "object") {
        return { ...SETTINGS_DEFAULTS };
    }

    return validateSettings(body.settings || {});
}