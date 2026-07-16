// frontend/js/chat.js

import { createElement, formatTime, copy } from "./utils.js";
import { renderInto } from "./markdown.js";

const messages = [];

let container;

export function initChat() {
    container = document.getElementById("messages");
}

export function getMessages() {
    return messages;
}

export function clearChat() {
    messages.length = 0;

    container.innerHTML = `
        <section class="welcome">
            <h1>What can I help with?</h1>
            <p>Conversations are temporary.</p>
        </section>
    `;
}

export async function addUserMessage(content) {
    const message = {
        role: "user",
        content,
        time: Date.now()
    };

    messages.push(message);

    const element = createMessage(message);
    container.appendChild(element);
    element.querySelector(".content").textContent = content;

    return element;
}

export async function addAssistantMessage(content = "") {
    const message = {
        role: "assistant",
        content,
        time: Date.now()
    };

    messages.push(message);

    const element = createMessage(message);
    container.appendChild(element);

    if (content) {
        await renderInto(element.querySelector(".content"), content);
    }

    return element;
}

export async function updateAssistantMessage(element, text) {
    const content = element.querySelector(".content");
    await renderInto(content, text);

    const last = messages.at(-1);
    if (last) {
        last.content = text;
    }
}

function createMessage(message) {
    const isUser = message.role === "user";

    const wrapper = createElement(
        "article",
        `message ${isUser ? "user" : "ai"}`
    );

    wrapper.innerHTML = `
        <div class="avatar">
            ${isUser ? "U" : "AI"}
        </div>
        <div class="bubble">
            <div class="content"></div>
            <div class="message-footer">
                <span class="time">${formatTime(new Date(message.time))}</span>
                <div class="message-actions">
                    <button class="action-btn copy-btn">Copy</button>
                    ${!isUser ? `<button class="action-btn regenerate-btn">Retry</button>` : ""}
                </div>
            </div>
        </div>
    `;

    wrapper.querySelector(".copy-btn").addEventListener("click", async () => {
        await copy(message.content);
    });

    return wrapper;
}
