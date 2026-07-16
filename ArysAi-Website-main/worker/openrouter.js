// worker/openrouter.js

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];

export async function requestModel({ env, model, messages, signal }) {
    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal,
        headers: {
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": env.APP_URL ?? "https://example.com",
            "X-Title": "Arys AI"
        },
        body: JSON.stringify({ model, stream: true, messages })
    });

    if (RETRYABLE_STATUS.includes(response.status)) {
        throw { retryable: true, status: response.status };
    }

    if (!response.ok) {
        throw { retryable: false, status: response.status };
    }

    return response;
}
