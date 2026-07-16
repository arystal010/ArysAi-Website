// worker/promptBuilder.js
//
// Builds a clean, structured prompt that includes web search context.
// Never sends raw webpages to the model — only curated summaries.

/**
 * Build the web search context block.
 *
 * @param {Array<{url:string,title:string,summary:string}>} results
 * @returns {string} Formatted context block or empty string.
 */
export function buildWebContext(results) {
    if (!results || results.length === 0) {
        return "";
    }

    const lines = ["Web Search Results", ""];

    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const idx = i + 1;
        lines.push(`Source ${idx}: ${r.title}`);
        lines.push(`URL: ${r.url}`);
        lines.push(`Summary: ${r.summary}`);
        lines.push("");
    }

    return lines.join("\n");
}

/**
 * Build the final messages array for the LLM.
 * Prepends the web context (if any) as a system message before the user's message.
 *
 * @param {Array<{role:string,content:string}>} messages - Original conversation messages.
 * @param {Array<{url:string,title:string,summary:string}>} searchResults - Search results.
 * @param {string} systemPrompt - Base system prompt.
 * @returns {Array<{role:string,content:string}>} Modified messages for the model.
 */
export function buildMessagesWithSearch(messages, searchResults, systemPrompt) {
    const webContext = buildWebContext(searchResults);

    if (!webContext) {
        // No search results — return original messages with system prompt.
        return [
            { role: "system", content: systemPrompt },
            ...messages
        ];
    }

    // Inject web context as an additional system message.
    // This keeps the user's original message intact and adds context.
    return [
        { role: "system", content: systemPrompt },
        { role: "system", content: webContext },
        ...messages
    ];
}

/**
 * Build a user-facing indicator message for the UI.
 *
 * @param {Array} results
 * @param {boolean} fromCache
 * @returns {string|null} Indicator text or null if no results.
 */
export function buildSearchIndicator(results, fromCache) {
    if (!results || results.length === 0) {
        return "No relevant web results.";
    }

    const source = fromCache ? " (cached)" : "";
    return `✓ Web results found${source} — ${results.length} source${results.length > 1 ? "s" : ""} used.`;
}