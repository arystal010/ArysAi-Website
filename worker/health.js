// worker/health.js

import { health, MODELS } from "./models.js";

const MAX_FAILURES = 3;
const COOLDOWN_MS = 10 * 60 * 1000;

export function initHealth() {
    for (const model of MODELS) {
        if (!health.has(model.id)) {
            health.set(model.id, { failures: 0, unhealthyUntil: 0 });
        }
    }
}

export function markSuccess(modelId) {
    const state = health.get(modelId);
    if (!state) return;
    state.failures = 0;
    state.unhealthyUntil = 0;
}

export function markFailure(modelId) {
    const state = health.get(modelId);
    if (!state) return;
    state.failures++;
    if (state.failures >= MAX_FAILURES) {
        state.failures = 0;
        state.unhealthyUntil = Date.now() + COOLDOWN_MS;
    }
}

export function nextHealthyModels() {
    initHealth();
    return MODELS.filter(m => Date.now() >= health.get(m.id).unhealthyUntil);
}
