// worker/searchDecision.js
//
// Automatic search decision engine.
// Decides whether a user message should trigger a web search.

// Patterns that STRONGLY suggest a web search is needed.
const TRIGGER_PATTERNS = [
    // Time-sensitive
    /\b(latest|newest|recent|breaking|current|today|yesterday|this\s+(week|month|year|morning|evening))\b/i,
    /\b(just\s+(in|released|announced|published|launched))\b/i,
    /\b(as\s+of\s+(today|now|this\s+week|202\d))\b/i,
    // Real-time data
    /\b(stock|stocks|share\s+price|market\s+(cap|value)|nasdaq|nyse|ticker)\b/i,
    /\b(crypto|cryptocurrency|bitcoin|btc|ethereum|eth|solana|bnb|token)\b/i,
    /\b(price|prices?|cost|rate|exchange\s*rate|fx|forex)\b/i,
    /\b(weather|forecast|temperature|rain|snow|wind)\b/i,
    // Events & news
    /\b(breaking\s*news|headlines|news\s+update|announce(d|ment))\b/i,
    /\b(election|elected|president|prime\s+minister|cabinet|summit|conference)\b/i,
    /\b(earthquake|hurricane|flood|wildfire|tsunami|pandemic|outbreak)\b/i,
    // Documentation / packages
    /\b(documentation|docs|api\s+ref|changelog|release\s+(notes|v?\d+\.\d+))\b/i,
    /\b(npm\s+package|pypi|crates\.io|maven\s+central|rubygems)\b/i,
    /\b(version|release|update|upgrade|deprecat(e|ion|ed))\b/i,
    /\b(github\s+(repo|release|tag|star)|gitlab|git\s+commit)\b/i,
    // General queries that likely need fresh data
    /\b(who\s+is|what\s+is|tell\s+me\s+about|facts?\s+about)\b.*\b(in\s+202\d|current|today|now)\b/i,
    /\bhow\s+(many|much)\b.*\b(202\d|this\s+year)\b/i,
    /\b(search|find|look\s+up|check|google)\b.*\b(for|online|web|internet)\b/i,
];

// Patterns that EXCLUDE search (no need for web results).
const EXCLUDE_PATTERNS = [
    // Pure language tasks
    /\b(translate|translation|interpret|interpretation)\b/i,
    /\b(rewrite|rewriting|paraphrase|paraphrasing)\b/i,
    /\b(grammar|proofread|proofreading|spell\s+check)\b/i,
    // Pure code / reasoning
    /\b(debug|debugging|fix\s+this\s+(code|bug|error|issue))\b/i,
    /\b(write|implement|create|build|develop)\b.*\b(function|class|component|module|api)\b/i,
    /\b(code|coding|programming|algorithm|leetcode|hackerrank)\b/i,
    // Math / logic
    /\b(solve|calculate|compute|simplify|evaluate|integrate|differentiate)\b.*\b(equation|expression|formula)\b/i,
    /\b(math|mathematics|algebra|calculus|geometry|trigonometry)\b/i,
    // Creative writing
    /\b(story|storytelling|poem|poetry|essay|creative\s+writing)\b/i,
    /\b(write\s+a|draft|compose)\b.*\b(story|poem|essay|letter|email)\b/i,
    // General conversation (no search needed)
    /\b(hi|hello|hey|good\s+(morning|afternoon|evening))\s*$/i,
    /\b(how\s+are\s+you|what's\s+up|what\s+are\s+you\s+doing)\b/i,
    /\b(thank|thanks|appreciate)\b/i,
];

/**
 * Decide if a message should trigger a web search.
 * Uses automatic pattern matching.
 *
 * @param {string} message - The user's message content.
 * @param {boolean} autoSearchEnabled - Whether automatic search is enabled.
 * @returns {{ shouldSearch: boolean, reason: string }}
 */
export function shouldSearch(message, autoSearchEnabled = true) {
    if (!autoSearchEnabled) {
        return { shouldSearch: false, reason: "auto_search_disabled" };
    }

    if (!message || message.trim().length < 5) {
        return { shouldSearch: false, reason: "too_short" };
    }

    // Check exclusion first (overrides triggers).
    for (const pattern of EXCLUDE_PATTERNS) {
        if (pattern.test(message)) {
            return { shouldSearch: false, reason: "excluded_by_pattern" };
        }
    }

    // Check trigger patterns.
    for (const pattern of TRIGGER_PATTERNS) {
        if (pattern.test(message)) {
            return { shouldSearch: true, reason: "trigger_pattern_matched" };
        }
    }

    // If the user explicitly asks for search, honor it.
    if (/\b(search|google|look\s+up|find\s+online|web\s+search|browse)\b/i.test(message)) {
        return { shouldSearch: true, reason: "user_explicitly_requested_search" };
    }

    return { shouldSearch: false, reason: "no_trigger_pattern" };
}