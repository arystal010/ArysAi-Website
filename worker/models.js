// worker/models.js

export const MODELS = [
    { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek Chat V3", priority: 1 },
    { id: "deepseek/deepseek-r1",           name: "DeepSeek R1",      priority: 2 },
    { id: "qwen/qwen3.5-122b-a10b",         name: "Qwen 3.5 122B",    priority: 3 }
];

export const health = new Map();
