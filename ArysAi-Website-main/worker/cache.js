// worker/cache.js
//
// Intelligent caching layer for search results using Cloudflare Cache API.
// Caches identical searches for a configurable duration (default: 5 minutes).

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

/**
 * Generate a cache key for a search query.
 *
 * @param {string} query
 * @returns {Request} A unique request object for cache lookup.
 */
function buildCacheRequest(query, limit) {
    const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
    const key = `firecrawl-search:${normalized}:limit=${limit}`;
    return new Request(`https://cache.arysai.workers.dev/${key}`);
}

/**
 * Try to retrieve cached search results.
 *
 * @param {Request} cacheReq - The cache request object.
 * @param {object} caches - The Cloudflare caches API (passed from env or global).
 * @returns {Promise<{results: Array, raw: object}|null>} Cached data or null.
 */
async function getCached(cacheReq, cachesApi) {
    const cache = cachesApi || caches?.default;
    if (!cache) return null;

    try {
        const response = await cache.match(cacheReq);
        if (!response || !response.ok) return null;

        const data = await response.json();

        // Verify it has the expected shape.
        if (!Array.isArray(data?.results)) return null;

        console.error({
            event: "cache_hit",
            key: cacheReq.url
        });

        return data;
    } catch {
        return null;
    }
}

/**
 * Store search results in the cache.
 *
 * @param {Request} cacheReq - The cache request object.
 * @param {{results: Array, raw: object}} data - The data to cache.
 * @param {number} ttlSeconds - Time-to-live in seconds.
 * @param {object} cachesApi - The Cloudflare caches API.
 */
async function setCached(cacheReq, data, ttlSeconds, cachesApi) {
    const cache = cachesApi || caches?.default;
    if (!cache) return;

    try {
        const body = JSON.stringify(data);
        const response = new Response(body, {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": `public, s-maxage=${ttlSeconds}, max-age=${ttlSeconds}`,
                "X-Cache-Source": "firecrawl-search"
            }
        });

        // Cloudflare Cache API requires the response to be cloned (cache.put consumes the body).
        await cache.put(cacheReq, response.clone());

        console.error({
            event: "cache_miss",
            key: cacheReq.url,
            ttl: ttlSeconds
        });
    } catch {
        // Non-critical failure
        console.error({
            event: "cache_set_failed",
            key: cacheReq.url
        });
    }
}

/**
 * Execute a search with caching.
 *
 * @param {Function} searchFn - Async function (env, query, limit) => { results, raw }.
 * @param {object} env - Worker environment.
 * @param {string} query - Search query.
 * @param {number} limit - Max results (5-8).
 * @param {number} cacheDuration - Cache TTL in seconds. Default 300 (5 min).
 * @returns {Promise<{results: Array, raw: object, fromCache: boolean}>}
 */
export async function searchWithCache(searchFn, env, query, limit = 6, cacheDuration = DEFAULT_TTL_SECONDS) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return { results: [], raw: {}, fromCache: false };
    }

    const cacheReq = buildCacheRequest(trimmedQuery, limit);
    const cachesApi = env?.caches || globalThis?.caches;

    // Try cache first.
    const cached = await getCached(cacheReq, cachesApi);
    if (cached) {
        return { ...cached, fromCache: true };
    }

    // Cache miss — execute the actual search.
    const fresh = await searchFn(env, trimmedQuery, limit);

    // Store in cache (non-blocking).
    setCached(cacheReq, fresh, Math.max(60, cacheDuration), cachesApi).catch(() => {});

    return { ...fresh, fromCache: false };
}