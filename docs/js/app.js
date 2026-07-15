// frontend/js/app.js

import {
    initChat,
    getMessages,
    clearChat,
    addUserMessage,
    addAssistantMessage,
    updateAssistantMessage
} from "./chat.js";

import { streamChat, stopGeneration } from "./api.js";
import { initTheme } from "./themes.js";
import { initMarkdown } from "./markdown.js";
import {
    scrollToBottom,
    autoResize,
    createTypingIndicator,
    isEnter
} from "./utils.js";

import { SELECTORS, DEFAULT_SYSTEM_PROMPT } from "./config.js";

let isGenerating = false;

async function init() {
    initChat();
    initTheme();
    await initMarkdown();
    bindEvents();
}

function bindEvents() {
    const sendBtn      = document.querySelector(SELECTORS.send);
    const stopBtn      = document.querySelector(SELECTORS.stop);
    const newChatBtn   = document.querySelector(SELECTORS.newChat);
    const promptEl     = document.querySelector(SELECTORS.prompt);
    const chatContainer = document.getElementById("chatContainer");
    const scrollBtn    = document.querySelector(SELECTORS.scroll);

    sendBtn.addEventListener("click", handleSend);

    stopBtn.addEventListener("click", handleStop);

    newChatBtn.addEventListener("click", handleNewChat);

    promptEl.addEventListener("keydown", e => {
        if (isEnter(e)) {
            e.preventDefault();
            handleSend();
        }
    });

    promptEl.addEventListener("input", () => {
        autoResize(promptEl);
    });

    chatContainer.addEventListener("scroll", () => {
        const atBottom =
            chatContainer.scrollHeight -
            chatContainer.scrollTop -
            chatContainer.clientHeight < 150;
        scrollBtn.classList.toggle("show", !atBottom);
    });

    scrollBtn.addEventListener("click", () => {
        scrollToBottom(chatContainer);
    });
}

async function handleSend() {
    if (isGenerating) return;

    const promptEl      = document.querySelector(SELECTORS.prompt);
    const chatContainer = document.getElementById("chatContainer");
    const messagesEl    = document.querySelector(SELECTORS.messages);

    const content = promptEl.value.trim();
    if (!content) return;

    promptEl.value = "";
    autoResize(promptEl);

    await addUserMessage(content);
    scrollToBottom(chatContainer);

    // Build the full message list for the API (system prompt + history)
    const history = getMessages().map(m => ({
        role: m.role,
        content: m.content
    }));

    const messages = [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT },
        ...history
    ];

    // Typing indicator while waiting for first token
    const typingIndicator = createTypingIndicator();
    messagesEl.appendChild(typingIndicator);
    scrollToBottom(chatContainer);

    let assistantEl = null;

    setGenerating(true);

    await streamChat({
        messages,

        onStart: () => {},

        onToken: async (_token, fullText) => {
            if (!assistantEl) {
                typingIndicator.remove();
                assistantEl = await addAssistantMessage("");
            }
            await updateAssistantMessage(assistantEl, fullText);
            scrollToBottom(chatContainer);
        },

        onFinish: async fullText => {
            typingIndicator.remove();
            if (!assistantEl && fullText) {
                assistantEl = await addAssistantMessage(fullText);
            }
            setGenerating(false);
            scrollToBottom(chatContainer);
        },

        onError: async msg => {
            typingIndicator.remove();
            if (!assistantEl) {
                await addAssistantMessage(`⚠️ ${msg}`);
            }
            setGenerating(false);
        }
    });
}

function handleStop() {
    stopGeneration();
    setGenerating(false);
}

function handleNewChat() {
    if (isGenerating) {
        stopGeneration();
    }
    clearChat();
    setGenerating(false);

    const promptEl = document.querySelector(SELECTORS.prompt);
    promptEl.focus();
}

function setGenerating(value) {
    isGenerating = value;
    const sendBtn = document.querySelector(SELECTORS.send);
    const stopBtn = document.querySelector(SELECTORS.stop);
    sendBtn.hidden = value;
    stopBtn.hidden = !value;
}

init();
