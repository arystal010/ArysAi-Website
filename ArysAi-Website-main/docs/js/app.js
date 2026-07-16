// frontend/js/app.js
//
// Main application logic — chat, settings, and search indicators.

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
import {
    loadSettings,
    getSettings,
    setSettings,
    resetSettings
} from "./settings.js";

let isGenerating = false;

async function init() {
    initChat();
    initTheme();
    await initMarkdown();
    loadSettings();
    bindEvents();
    bindSettingsEvents();
    populateSettingsUI();
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
    let searchIndicatorEl = null;

    setGenerating(true);

    await streamChat({
        messages,

        onStart: () => {},

        onSearch: ({ status, text }) => {
            // Show or update the search indicator in the UI.
            if (!searchIndicatorEl) {
                searchIndicatorEl = createSearchIndicator();
                messagesEl.appendChild(searchIndicatorEl);
            }
            updateSearchIndicator(searchIndicatorEl, status, text);
            scrollToBottom(chatContainer);
        },

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
            if (searchIndicatorEl) {
                // Keep the indicator visible briefly then remove.
                setTimeout(() => {
                    if (searchIndicatorEl && searchIndicatorEl.parentNode) {
                        searchIndicatorEl.remove();
                    }
                }, 4000);
            }
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

/* ------------------------------------------------------------------ */
/* Settings UI                                                         */
/* ------------------------------------------------------------------ */

function bindSettingsEvents() {
    const settingsBtn   = document.getElementById("settingsBtn");
    const settingsPanel = document.getElementById("settingsPanel");
    const closeBtn      = document.getElementById("settingsCloseBtn");
    const resetBtn      = document.getElementById("settingsResetBtn");

    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener("click", () => {
            settingsPanel.classList.toggle("open");
        });
    }

    if (closeBtn && settingsPanel) {
        closeBtn.addEventListener("click", () => {
            settingsPanel.classList.remove("open");
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            resetSettings();
            populateSettingsUI();
        });
    }

    // Bind toggle/input changes.
    const toggles = [
        "enableWebSearch",
        "enableAutoSearch",
        "showSearchIndicator"
    ];

    toggles.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", () => {
                setSettings({ [id]: el.checked });
            });
        }
    });

    const maxResults = document.getElementById("maxSearchResults");
    if (maxResults) {
        maxResults.addEventListener("change", () => {
            const val = parseInt(maxResults.value, 10);
            setSettings({ maxSearchResults: isNaN(val) ? 6 : val });
        });
    }

    const cacheDuration = document.getElementById("cacheDuration");
    if (cacheDuration) {
        cacheDuration.addEventListener("change", () => {
            const val = parseInt(cacheDuration.value, 10);
            setSettings({ cacheDuration: isNaN(val) ? 300 : val });
        });
    }
}

function populateSettingsUI() {
    const s = getSettings();

    const setChecked = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = val;
    };

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setChecked("enableWebSearch", s.enableWebSearch);
    setChecked("enableAutoSearch", s.enableAutoSearch);
    setChecked("showSearchIndicator", s.showSearchIndicator);
    setVal("maxSearchResults", s.maxSearchResults);
    setVal("cacheDuration", s.cacheDuration);
}

/* ------------------------------------------------------------------ */
/* Search indicator helpers                                            */
/* ------------------------------------------------------------------ */

function createSearchIndicator() {
    const div = document.createElement("div");
    div.className = "search-indicator";
    div.innerHTML = `<span class="search-icon">🌐</span><span class="search-text">Searching the web...</span>`;
    return div;
}

function updateSearchIndicator(el, status, text) {
    const iconEl = el.querySelector(".search-icon");
    const textEl = el.querySelector(".search-text");

    if (status === "success") {
        el.classList.add("success");
        if (iconEl) iconEl.textContent = "✓";
        if (textEl) textEl.textContent = text || "Web results found";
    } else if (status === "empty") {
        el.classList.add("empty");
        if (iconEl) iconEl.textContent = "ℹ️";
        if (textEl) textEl.textContent = text || "No relevant web results.";
    } else if (status === "error") {
        el.classList.add("error");
        if (iconEl) iconEl.textContent = "⚠️";
        if (textEl) textEl.textContent = text || "Search unavailable.";
    } else {
        if (iconEl) iconEl.textContent = "🌐";
        if (textEl) textEl.textContent = text || "Searching the web...";
    }
}

init();