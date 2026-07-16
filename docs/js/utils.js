// frontend/js/utils.js

export const $ = (selector, parent = document) => parent.querySelector(selector);

export const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

export function createElement(tag, className = "", html = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
}

export function escapeHTML(text = "") {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function scrollToBottom(container) {
    requestAnimationFrame(() => {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });
    });
}

export function autoResize(textarea) {
    textarea.style.height = "0px";
    textarea.style.height = Math.min(textarea.scrollHeight, 220) + "px";
}

export function debounce(fn, delay = 100) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

export async function copy(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

export function isMobile() {
    return window.innerWidth < 768;
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function removeChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
}

export function createTypingIndicator() {
    const wrapper = createElement("div", "message ai");

    wrapper.innerHTML = `
        <div class="avatar">AI</div>
        <div class="bubble">
            <div class="typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    return wrapper;
}

export function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function safeJSON(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

export function once(element, event, callback) {
    const fn = e => {
        element.removeEventListener(event, fn);
        callback(e);
    };
    element.addEventListener(event, fn);
}

export function isEnter(event) {
    return event.key === "Enter" && !event.shiftKey;
}
