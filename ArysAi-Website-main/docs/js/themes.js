// frontend/js/themes.js

const STORAGE_KEY = "arys-theme";

let currentTheme = "dark";

function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function updateButton(button) {
    if (!button) return;
    button.textContent = currentTheme === "dark" ? "☀️" : "🌙";
}

export function applyTheme(theme) {
    currentTheme = theme;
    document.body.classList.remove("dark", "light");
    document.body.classList.add(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    document
        .querySelector("meta[name='theme-color']")
        ?.setAttribute("content", theme === "dark" ? "#0b0f17" : "#ffffff");
    updateButton(document.getElementById("themeBtn"));
}

export function toggleTheme() {
    applyTheme(currentTheme === "dark" ? "light" : "dark");
}

export function initTheme() {
    applyTheme(getPreferredTheme());

    const button = document.getElementById("themeBtn");
    if (button) {
        button.addEventListener("click", toggleTheme);
    }

    window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", e => {
            if (!localStorage.getItem(STORAGE_KEY)) {
                applyTheme(e.matches ? "dark" : "light");
            }
        });
}
