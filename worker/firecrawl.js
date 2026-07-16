// worker/firecrawl.js
//
// Firecrawl v2 Search service.
// All requests happen ONLY inside the Cloudflare Worker.
// The API key is read from environment secrets (env.FIRECRAWL_API_KEY).
// Never expose the key to the browser.

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

// Signals that a page is low quality / not useful.
const LOW_QUALITY_PATTERNS = [
    /login/i,
    /sign\s?in/i,
    /sign\s?up/i,
    /cookie\s?policy/i,
    /terms\s?of\s?service/i,
    /privacy\s?policy/i,
    /captcha/i,
    /access\s?denied/i,
    /404/i,
    /page\s?not\s?found/i
];

function isLowQuality(result) {
    const url = result.url || "";
    const title = result.title || "";
    const text = result.markdown || result.content || "";

    for (const pattern of LOW_QUALITY_PATTERNS) {
        if (pattern.test(url) || pattern.test(title)) return true;
    }

    // Ignore pages with almost no content.
    if (text.trim().length < 120) return true;

    return false;
}

function normalizeUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
    } catch {
        return url;
    }
}

function dedupe(results) {
    const seen = new Map();
    for (const r of results) {
        const key = normalizeUrl(r.url || "");
        if (!seen.has(key)) {
            seen.set(key, r);
        }
    }
    return [...seen.values()];
}

function summarize(markdown = "", maxChars = 600) {
    const clean = markdown
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[#>*_`|-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return clean.length > maxChars ? clean.slice(0, maxChars).trim() + "…" : clean;
}

/**
 * Perform a Firecrawl v2 search.
 *
 * @param {object} env - Worker environment (must contain FIRECRAWL_API_KEY)
 * @param {string} query - Search query
 * @param {number} limit - Max number of results (5-8)
 * @returns {Promise<{results: Array<{url:string,title:string,summary:string}>, raw: object}>}
 */
export async function firecrawlSearch(env, query, limit = 6) {
    const apiKey = env.FIRECRAWL_API_KEY;

    if (!apiKey) {
        const err = new Error("Firecrawl API key is not configured");
        err.code = "INVALID_API_KEY";
        throw err;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const startedAt = Date.now();

    try {
        const response = await fetch(`${FIRECRAWL_BASE}/search`, {
            method: "POST",
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query,
                limit: Math.max(5, Math.min(8, limit)),
                format: "markdown",
                pageOptions: {
                    includeMarkdown: true,
                    includeHtml: false
                }
            })
        });

        const responseTime = Date.now() - startedAt;

        if (response.status === 401 || response.status === 403) {
            const err = new Error("Firecrawl authentication failed");
            err.code = "INVALID_API_KEY";
            err.status = response.status;
            console.error({
                event: "search_failed",
                reason: "invalid_api_key",
                status: response.status,
                responseTime
            });
            throw err;
        }

        if (response.status === 429) {
            const err = new Error("Firecrawl rate limit exceeded");
            err.code = "RATE_LIMIT";
            err.status = response.status;
            console.error({
                event: "search_failed",
                reason: "rate_limit",
                responseTime
            });
            throw err;
        }

        if (!response.ok) {
            const err = new Error(`Firecrawl error ${response.status}`);
            err.code = "HTTP_ERROR";
            err.status = response.status;
            console.error({
                event: "search_failed",
                reason: "http_error",
                status: response.status,
                responseTime
            });
            throw err;
        }

        let data;
        try {
            data = await response.json();
        } catch {
            const err = new Error("Malformed JSON from Firecrawl");
            err.code = "MALFORMED_JSON";
            console.error({ event: "search_failed", reason: "malformed_json", responseTime });
            throw err;
        }

        const rawResults = Array.isArray(data?.data) ? data.data : [];

        if (rawResults.length === 0) {
            console.error({
                event: "search_completed",
                reason: "empty_results",
                query,
                responseTime
            });
            return { results: [], raw: data };
        }

        const filtered = rawResults
            .filter(r => !isLowQuality(r))
            .map(r => ({
                url: r.url || "",
                title: r.title || r.url || "Untitled",
                summary: summarize(r.markdown || r.content || "")
            }));

        const deduped = dedupe(filtered).slice(0, Math.max(5, Math.min(8, limit)));

        console.error({
            event: "search_completed",
            query,
            total: rawResults.length,
            kept: deduped.length,
            responseTime
        });

        return { results: deduped, raw: data };
    } catch (error) {
        clearTimeout(timeout);

        if (error.name === "AbortError") {
            const err = new Error("Firecrawl request timed out");
            err.code = "TIMEOUT";
            console.error({ event: "search_failed", reason: "timeout", query });
            throw err;
        }

        if (error.code) throw error;

        const err = new Error("Firecrawl network failure");
        err.code = "NETWORK_FAILURE";
        console.error({ event: "search_failed", reason: "network_failure", query, message: error.message });
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}