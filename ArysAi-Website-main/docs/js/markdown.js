// frontend/js/markdown.js

import { copy } from "./utils.js";

let markedReady = false;
let highlightReady = false;

async function loadMarked() {
    if (markedReady) return;

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    document.head.appendChild(script);

    await new Promise(resolve => { script.onload = resolve; });

    marked.setOptions({ gfm: true, breaks: true });
    markedReady = true;
}

async function loadHighlight() {
    if (highlightReady) return;

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/highlight.js/styles/github-dark.min.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/highlight.js/lib/common.min.js";
    document.head.appendChild(script);

    await new Promise(resolve => { script.onload = resolve; });
    highlightReady = true;
}

export async function initMarkdown() {
    await loadMarked();
    await loadHighlight();
}

function sanitize(html) {
    return html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+="[^"]*"/gi, "")
        .replace(/on\w+='[^']*'/gi, "");
}

export async function renderMarkdown(text) {
    if (!markedReady) await initMarkdown();
    const html = marked.parse(text);
    return sanitize(html);
}

export async function renderInto(element, text) {
    element.innerHTML = await renderMarkdown(text);

    if (window.hljs) {
        element.querySelectorAll("pre code").forEach(block => {
            hljs.highlightElement(block);
        });
    }

    addCopyButtons(element);
}

function addCopyButtons(root) {
    root.querySelectorAll("pre").forEach(pre => {
        if (pre.querySelector(".copy-code")) return;

        const btn = document.createElement("button");
        btn.className = "copy-code";
        btn.textContent = "Copy";

        btn.onclick = async () => {
            const code = pre.querySelector("code")?.innerText ?? "";
            const ok = await copy(code);
            btn.textContent = ok ? "Copied!" : "Failed";
            setTimeout(() => { btn.textContent = "Copy"; }, 1500);
        };

        pre.style.position = "relative";
        btn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            border: 0;
            border-radius: 7px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            background: #334155;
            color: #f8fafc;
        `;

        pre.appendChild(btn);
    });
}
