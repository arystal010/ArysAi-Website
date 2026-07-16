// worker/utils.js

export function streamHeaders(cors = {}) {
    return {
        ...cors,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    };
}

export function buildDoneEvent() {
    return "data: [DONE]\n\n";
}

export function buildTextEvent(text) {
    return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
}
