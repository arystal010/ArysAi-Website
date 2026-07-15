// worker/health.js

import {
    health,
    MODELS
} from "./models.js";

const MAX_FAILURES = 3;

const COOLDOWN_MS =
    10 * 60 * 1000;

export function initHealth() {

    for (const model of MODELS) {

        if (!health.has(model.id)) {

            health.set(model.id, {

                failures: 0,

                unhealthyUntil: 0,
                lastFailure: 0,
                lastSuccess: 0

            });

        }

    }

}

export function markSuccess(modelId) {

    const state = health.get(modelId);

    if (!state) return;

    state.failures = 0;

    state.lastSuccess = Date.now();

    state.unhealthyUntil = 0;

}

export function markFailure(modelId) {

    const state = health.get(modelId);

    if (!state) return;

    state.failures++;

    state.lastFailure = Date.now();

    if (state.failures >= MAX_FAILURES) {

        state.failures = 0;

        state.unhealthyUntil =
            Date.now() + COOLDOWN_MS;

    }

}

export function isHealthy(modelId) {

    const state = health.get(modelId);

    if (!state) return true;

    return (
        Date.now() >=
        state.unhealthyUntil
    );

}

export function nextHealthyModels() {

    initHealth();

    return MODELS.filter(model =>
        isHealthy(model.id)
    );

}

export function healthSnapshot() {

    initHealth();

    const result = {};

    for (const model of MODELS) {

        result[model.id] = {

            ...health.get(model.id)

        };

    }

    return result;

}
