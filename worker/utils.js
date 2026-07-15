// worker/utils.js

export const RETRYABLE_STATUS = new Set([
    408,
    409,
    425,
    429,
    500,
    502,
    503,
    504
]);

export function isRetryableStatus(status) {

    return RETRYABLE_STATUS.has(status);

}

export function sleep(ms) {

    return new Promise(resolve => {

        setTimeout(resolve, ms);

    });

}

export function createTimeoutSignal(ms = 60000) {

    const controller = new AbortController();

    const timeout = setTimeout(() => {

        controller.abort("timeout");

    }, ms);

    return {

        signal: controller.signal,

        cancel() {

            clearTimeout(timeout);

        }

    };

}

export function json(data, status = 200, headers = {}) {

    return new Response(

        JSON.stringify(data),

        {

            status,

            headers: {

                "Content-Type":
                    "application/json",

                ...headers

            }

        }

    );

}

export function streamHeaders(cors = {}) {

    return {

        ...cors,

        "Content-Type":
            "text/event-stream; charset=utf-8",

        "Cache-Control":
            "no-cache, no-transform",

        "Connection":
            "keep-alive",

        "X-Accel-Buffering":
            "no"

    };

}

export function isProviderError(error) {

    if (!error) return false;

    if (error.name === "AbortError")
        return true;

    if (error.retryable)
        return true;

    if (error.status &&
        RETRYABLE_STATUS.has(error.status))
        return true;

    return false;

}

export function buildDoneEvent() {

    return "data: [DONE]\n\n";

}

export function buildTextEvent(text) {

    return data: ${JSON.stringify({

        choices: [

            {

                delta: {

                    content: text

                }

            }

        ]

    })}\n\n;

}

export async function pipeStream(

    source,

    destination

) {

    const reader = source.getReader();

    const writer = destination.getWriter();

    try {

        while (true) {

            const {

                done,

                value

            } = await reader.read();

            if (done)
                break;

            await writer.write(value);

        }

    }

    finally {

        writer.close();

        reader.releaseLock();

    }

}
