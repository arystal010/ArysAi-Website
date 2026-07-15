// worker/router.js

import { nextHealthyModels } from "./health.js";
import { markFailure } from "./health.js";
import { markSuccess } from "./health.js";
import { requestModel } from "./openrouter.js";
import { streamHeaders } from "./utils.js";
import { buildTextEvent } from "./utils.js";
import { buildDoneEvent } from "./utils.js";

export async function handleChatRequest(
    request,
    env,
    cors
) {

    let body;

    try {

        body = await request.json();

    } catch {

        return new Response(

            JSON.stringify({

                error: "Invalid JSON"

            }),

            {

                status: 400,

                headers: {

                    ...cors,

                    "Content-Type":
                        "application/json"

                }

            }

        );

    }

    const messages =
        body.messages ?? [];

    const models =
        nextHealthyModels();

    if (models.length === 0) {

        return new Response(

            buildTextEvent(
                "All AI providers are currently busy. Please try again in a moment."
            ) +
            buildDoneEvent(),

            {

                status: 503,

                headers:
                    streamHeaders(cors)

            }

        );

    }

    let lastError = null;

    for (const model of models) {

        const controller =
            new AbortController();

        const timeout =
            setTimeout(

                () => {

                    controller.abort();

                },

                60000

            );

        try {

            const response =
                await requestModel({

                    env,

                    model: model.id,

                    messages,

                    signal:
                        controller.signal

                });

            clearTimeout(timeout);

            markSuccess(model.id);

            return new Response(

                response.body,

                {

                    status: 200,

                    headers:
                        streamHeaders(cors)

                }

            );

        }

        catch (error) {

            clearTimeout(timeout);

            lastError = error;

            markFailure(
                model.id
            );

            continue;

        }

    }
    return new Response(

        buildTextEvent(

            "All AI providers are currently busy. Please try again in a moment."

        ) +

        buildDoneEvent(),

        {

            status:

                lastError?.status ?? 503,

            headers:

                streamHeaders(cors)

        }

    );

}
