.js

export const MODELS = [

    {
        id: "qwen/qwen3-235b-a22b",
        name: "Qwen3 235B",
        priority: 1
    },

    {
        id: "deepseek/deepseek-chat-v3",
        name: "DeepSeek V3",
        priority: 2
    },

    {
        id: "qwen/qwen3-32b",
        name: "Qwen3 32B",
        priority: 3
    },

    {
        id: "deepseek/deepseek-r1",
        name: "DeepSeek R1",
        priority: 4
    }

];

export const health = new Map();

const MAX_FAILURES = 3;

const COOLDOWN = 10 * 60 * 1000;

export function initializeHealth() {

    for (const model of MODELS) {

        if (!health.has(model.id)) {

            health.set(model.id, {

                failures: 0,

                unhealthyUntil: 0

            });

        }

    }

}

export function getHealthyModels() {

    initializeHealth();

    const now = Date.now();

    return MODELS.filter(model => {

        const state = health.get(model.id);

        return state.unhealthyUntil <= now;

    });

}

export function recordSuccess(modelId) {

    const state = health.get(modelId);

    if (!state) return;

    state.failures = 0;

    state.unhealthyUntil = 0;

}

export function recordFailure(modelId) {

    const state = health.get(modelId);

    if (!state) return;

    state.failures++;

    if (state.failures >= MAX_FAILURES) {

        state.failures = 0;

        state.unhealthyUntil =

            Date.now() + COOLDOWN;

    }

}

export function canRetry(modelId) {

    const state = health.get(modelId);

    if (!state) return true;

    return state.unhealthyUntil <= Date.now();

}

export function resetHealth() {

    health.clear();

    initializeHealth();

}
