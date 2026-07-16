// frontend/js/api.js
//
// API client for the Arys AI chat worker.
// Handles streaming SSE, search events, and settings.

import { CONFIG } from "./config.js";
import { getSettings } from "./settings.js";

let controller = null;

/**
 * Stop an ongoing generation request.
 */
export function stopGeneration() {
    if (controller) {
        controller.abort();
        controller = null;
    }
}

/**
 * Stream a chat response from the worker.
 *
 * @param {object} options
 * @param {Array}  options.messages     - Message history
 * @param {Function} options.onStart    - Called when request begins
 * @param {Function} options.onToken    - Called with (token, fullText) for each token
 * @param {Function} options.onFinish   - Called with final text
 * @param {Function} options.onSearch   - Called with ({ status, text }) for search events
 * @param {Function} options.onError    - Called with error message string
 */
export async function streamChat({
    messages,
    onStart = () => {},
    onToken = () => {},
    onFinish = () => {},
    onSearch = () => {},
    onError = () => {}
}) {
    controller = new AbortController();

    try {
        onStart();

        // Include settings in the request body so the server can use them.
        const settings = getSettings();
        const body = JSON.stringify({ messages, settings });

        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let searchIndicated = false;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (!line.startsWith("data:")) continue;

                const payload = line.slice(5).trim();

                if (payload === "[DONE]") {
                    onFinish(fullText);
                    controller = null;
                    return;
                }

                let json;
                try {
                    json = JSON.parse(payload);
                } catch {
                    continue;
                }

                // Search indicator event
                if (json.type === "search") {
                    onSearch({
                        status: json.status,
                        text: json.text
                    });
                    searchIndicated = true;
                    continue;
                }

                // Regular token delta
                const token = json?.choices?.[0]?.delta?.content;
                if (!token) continue;

                fullText += token;
                await onToken(token, fullText);
            }
        }

        onFinish(fullText);

    } catch (err) {
        if (err.name === "AbortError") {
            onError("Generation stopped.");
        } else {
            onError(err.message || "Unknown Error");
        }
    } finally {
        controller = null;
    }
}