// frontend/js/api.js

import { CONFIG } from "./config.js";

let controller = null;

export function stopGeneration() {
    if (controller) {
        controller.abort();
        controller = null;
    }
}

export async function streamChat({
    messages,
    onStart = () => {},
    onToken = () => {},
    onFinish = () => {},
    onError = () => {}
}) {
    controller = new AbortController();

    try {
        onStart();

        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let fullText = "";

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

                const token = json?.choices?.[0]?.delta?.content;

                if (!token) continue;

                fullText += token;
                onToken(token, fullText);
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
