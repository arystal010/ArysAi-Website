// worker/routers

import {
    getHealthyModels,
    recordFailure,
    recordSuccess
} from "./models.js";

import { requestModel } from "./openrouter.js";

const STREAM_HEADERS = {

    "Content-Type":"text/event-stream; charset=utf-8",

    "Cache-Control":"no-cache, no-transform",

    "Connection":"keep-alive"

};

function mergeHeaders(cors){

    return {

        ...cors,

        ...STREAM_HEADERS

    };

}

export async function handleChatRequest(

    request,

    env,

    cors

){

    const body = await request.json();

    const messages = body.messages ?? [];

    const models = getHealthyModels();

    if(models.length===0){

        return new Response(

data: ${JSON.stringify({
choices:[
{
delta:{
content:"All AI providers are currently busy. Please try again in a moment."
}
}
]
})}

data: [DONE]

,

            {

                headers:mergeHeaders(cors)

            }

        );

    }

    let lastError = null;

    for(const model of models){

        const controller = new AbortController();

        const timeout = setTimeout(

            ()=>controller.abort(),

            60000

        );

        try{

            const response =

                await requestModel({

                    env,

                    model:model.id,

                    messages,

                    signal:controller.signal

                });

            clearTimeout(timeout);

            recordSuccess(model.id);

            return new Response(

                response.body,

                {

                    status:200,

                    headers:mergeHeaders(cors)

                }

            );

        }

        catch(error){

            clearTimeout(timeout);

            recordFailure(model.id);

            lastError = error;

            if(error.retryable){

                continue;
            }

            continue;

        }

    }

    return new Response(

data: ${JSON.stringify({
choices:[
{
delta:{
content:"All AI providers are currently busy. Please try again in a moment."
}
}
]
})}

data: [DONE]

,

        {

            status:lastError?.status ?? 503,

            headers:mergeHeaders(cors)

        }

    );

}
