// worker/index.js

import { handleChatRequest } from "./router.js";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
};

function corsResponse(status = 200) {
    return new Response(null, { status, headers: CORS_HEADERS });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return corsResponse();
        }

        if (url.pathname === "/") {
            return new Response(
                JSON.stringify({ ok: true, service: "Arys AI Worker" }),
                { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }

        if (url.pathname === "/api/chat" && request.method === "POST") {
            try {
                return await handleChatRequest(request, env, CORS_HEADERS);
            } catch (error) {
                console.error(error);
                return new Response(
                    JSON.stringify({ error: true, message: "Internal Worker Error" }),
                    { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
                );
            }
        }

        return new Response(
            JSON.stringify({ error: "Not Found" }),
            { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
};
