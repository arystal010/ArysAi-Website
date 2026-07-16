// worker/index.js
//
// Main worker entry point.
// Routes:
//   GET  /           - Health check
//   POST /api/chat   - Chat with optional web search
//   GET  /api/settings - Get default settings
//   POST /api/settings - Validate & return settings
//   GET  /*           - Serve static frontend files

import { handleChatRequest } from "./router.js";
import { SETTINGS_DEFAULTS, validateSettings } from "./settings.js";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
};

const STATIC_CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf"
};

function corsResponse(status = 200) {
    return new Response(null, { status, headers: CORS_HEADERS });
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Handle CORS preflight.
        if (request.method === "OPTIONS") {
            return corsResponse();
        }

        // Health check.
        if (url.pathname === "/") {
            return jsonResponse({ ok: true, service: "Arys AI Worker" });
        }

        // Chat endpoint.
        if (url.pathname === "/api/chat" && request.method === "POST") {
            try {
                return await handleChatRequest(request, env, CORS_HEADERS);
            } catch (error) {
                console.error("Chat handler error:", error);
                return jsonResponse(
                    { error: true, message: "Internal Worker Error" },
                    500
                );
            }
        }

        // Settings GET — return defaults.
        if (url.pathname === "/api/settings") {
            if (request.method === "GET") {
                return jsonResponse({ settings: { ...SETTINGS_DEFAULTS } });
            }

            // Settings POST — validate and return.
            if (request.method === "POST") {
                try {
                    const body = await request.json();
                    const validated = validateSettings(body.settings || body);
                    return jsonResponse({ settings: validated });
                } catch {
                    return jsonResponse(
                        { error: true, message: "Invalid JSON" },
                        400
                    );
                }
            }

            return jsonResponse({ error: "Method not allowed" }, 405);
        }

        // Static file serving — serve the frontend from docs/.
        // Path mapping: / -> index.html, /css/* -> docs/css/*, /js/* -> docs/js/*
        let fsPath = url.pathname === "/" ? "/index.html" : url.pathname;

        // Determine content type.
        const ext = fsPath.split(".").pop().toLowerCase();
        const contentType = STATIC_CONTENT_TYPES[`.${ext}`] || "application/octet-stream";

        // We serve static files from the docs/ directory.
        // In Cloudflare Workers, we can't read local files directly at runtime,
        // so we handle this through a static asset binding or inline.
        // Since this is a Workers project, we'll return the index.html for SPA fallback.
        // The actual static files are served separately (e.g., via Cloudflare Pages).
        if (url.pathname.startsWith("/js/") || url.pathname.startsWith("/css/") || url.pathname === "/index.html") {
            return fetch(`https://arysai.pages.dev${url.pathname}`)
                .catch(() => jsonResponse({ error: "Static file not found" }, 404));
        }

        // Default catch-all: serve index.html for SPA routing or 404.
        if (url.pathname.startsWith("/")) {
            return jsonResponse({ error: "Not Found", path: url.pathname }, 404);
        }

        return jsonResponse({ error: "Not Found" }, 404);
    }
};