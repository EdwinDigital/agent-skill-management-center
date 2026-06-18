const PRIVACY_MODE_KEY = "templatePrivacyMode";
const THEME_KEY = "templateTheme";

const state = {
  privacyMode: localStorage.getItem(PRIVACY_MODE_KEY) === "1",
  theme: localStorage.getItem(THEME_KEY) || "dark",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function applyTheme(theme) {
  state.theme = theme === "light" ? "light" : "dark";
  document.body.classList.toggle("theme-dark", state.theme === "dark");
  localStorage.setItem(THEME_KEY, state.theme);
}

function mask(value) {
  return state.privacyMode ? "***" : value;
}

function money(value) {
  if (state.privacyMode) return "***";
  const amount = Math.abs(Number(value || 0));
  const sign = Number(value || 0) < 0 ? "-" : "";
  if (amount >= 1e6) return `${sign}$${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `${sign}$${(amount / 1e3).toFixed(1)}K`;
  return `${sign}$${amount.toFixed(0)}`;
}

function pct(value) {
  if (state.privacyMode) return "***";
  return value === null || value === undefined ? "n/a" : `${Number(value) >= 0 ? "+" : ""}${(Number(value) * 100).toFixed(1)}%`;
}

function togglePrivacy() {
  state.privacyMode = !state.privacyMode;
  document.body.classList.toggle("privacy-mode", state.privacyMode);
  localStorage.setItem(PRIVACY_MODE_KEY, state.privacyMode ? "1" : "0");
  renderDemoValues();
}

function renderDemoValues() {
  $$("[data-money]").forEach((element) => {
    element.textContent = money(element.dataset.money);
  });
  $$("[data-pct]").forEach((element) => {
    element.textContent = pct(element.dataset.pct);
  });
  $$("[data-sensitive]").forEach((element) => {
    element.textContent = mask(element.dataset.sensitive);
  });
  const privacyButton = $("#privacy-toggle");
  if (privacyButton) {
    privacyButton.setAttribute("aria-pressed", state.privacyMode ? "true" : "false");
    privacyButton.classList.toggle("is-active", state.privacyMode);
  }
}

function bindTemplateEvents() {
  $("#theme-toggle")?.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });
  $("#privacy-toggle")?.addEventListener("click", togglePrivacy);
  $("#sidebar-toggle")?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
  });
  $("#assistant-toggle")?.addEventListener("click", () => {
    document.body.classList.toggle("assistant-collapsed");
  });
}

applyTheme(state.theme);
document.body.classList.toggle("privacy-mode", state.privacyMode);
bindTemplateEvents();
renderDemoValues();