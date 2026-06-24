const STORAGE_KEYS = {
  privacyMode: "templatePrivacyMode",
  theme: "templateTheme",
  sidebarCollapsed: "templateSidebarCollapsed",
  rightPanelCollapsed: "templateRightPanelCollapsed",
};

const state = {
  privacyMode: localStorage.getItem(STORAGE_KEYS.privacyMode) === "1",
  theme: localStorage.getItem(STORAGE_KEYS.theme) || "dark",
  sidebarCollapsed: localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === "1",
  rightPanelCollapsed: localStorage.getItem(STORAGE_KEYS.rightPanelCollapsed) !== "0",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function applyTheme(theme) {
  state.theme = theme === "light" ? "light" : "dark";
  document.body.classList.toggle("theme-dark", state.theme === "dark");
  localStorage.setItem(STORAGE_KEYS.theme, state.theme);
}

function applyShellState() {
  const shell = $(".app-shell");
  const rightPanel = $(".right-panel");
  if (!shell || !rightPanel) return;

  shell.dataset.sidebarCollapsed = state.sidebarCollapsed ? "true" : "false";
  shell.dataset.rightPanelCollapsed = state.rightPanelCollapsed ? "true" : "false";
  rightPanel.classList.toggle("is-collapsed", state.rightPanelCollapsed);

  $("#sidebar-toggle")?.setAttribute("aria-expanded", state.sidebarCollapsed ? "false" : "true");
  $("#sidebar-expand")?.setAttribute("aria-expanded", state.sidebarCollapsed ? "false" : "true");
  $("#right-panel-toggle")?.setAttribute("aria-expanded", state.rightPanelCollapsed ? "false" : "true");
  $("#right-panel-expand")?.setAttribute("aria-expanded", state.rightPanelCollapsed ? "false" : "true");
  $("#right-panel-collapse")?.setAttribute("aria-expanded", state.rightPanelCollapsed ? "false" : "true");
}

function setSidebarCollapsed(collapsed) {
  state.sidebarCollapsed = Boolean(collapsed);
  localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, state.sidebarCollapsed ? "1" : "0");
  applyShellState();
}

function setRightPanelCollapsed(collapsed) {
  state.rightPanelCollapsed = Boolean(collapsed);
  localStorage.setItem(STORAGE_KEYS.rightPanelCollapsed, state.rightPanelCollapsed ? "1" : "0");
  applyShellState();
}

function mask(value) {
  return state.privacyMode ? "***" : value;
}

function togglePrivacy(force) {
  state.privacyMode = typeof force === "boolean" ? force : !state.privacyMode;
  document.body.classList.toggle("privacy-mode", state.privacyMode);
  localStorage.setItem(STORAGE_KEYS.privacyMode, state.privacyMode ? "1" : "0");
  renderSensitiveValues();
}

function renderSensitiveValues() {
  $$('[data-sensitive]').forEach((element) => {
    element.textContent = mask(element.dataset.sensitive);
  });
  const privacyButton = $("#privacy-toggle");
  if (privacyButton) {
    privacyButton.setAttribute("aria-pressed", state.privacyMode ? "true" : "false");
    privacyButton.classList.toggle("is-active", state.privacyMode);
  }
  const privacySetting = $("#privacy-setting");
  if (privacySetting) {
    privacySetting.value = state.privacyMode ? "开启" : "关闭";
  }
}

function openDialog(dialog) {
  dialog?.classList.add("is-open");
  dialog?.setAttribute("aria-hidden", "false");
}

function closeDialog(dialog) {
  dialog?.classList.remove("is-open");
  dialog?.setAttribute("aria-hidden", "true");
}

function bindTemplateEvents() {
  $("#theme-toggle")?.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });
  $("#privacy-toggle")?.addEventListener("click", () => togglePrivacy());
  $("#sidebar-toggle")?.addEventListener("click", () => setSidebarCollapsed(true));
  $("#sidebar-expand")?.addEventListener("click", () => setSidebarCollapsed(false));
  $("#right-panel-toggle")?.addEventListener("click", () => setRightPanelCollapsed(!state.rightPanelCollapsed));
  $("#right-panel-expand")?.addEventListener("click", () => setRightPanelCollapsed(false));
  $("#right-panel-collapse")?.addEventListener("click", () => setRightPanelCollapsed(true));

  const settingsDialog = $("#settings-dialog");
  $("#settings-open")?.addEventListener("click", () => openDialog(settingsDialog));
  $$('[data-dialog-close]').forEach((element) => {
    element.addEventListener("click", () => closeDialog(settingsDialog));
  });
  $("#settings-save")?.addEventListener("click", () => {
    togglePrivacy($("#privacy-setting")?.value === "开启");
    closeDialog(settingsDialog);
  });
}

applyTheme(state.theme);
applyShellState();
togglePrivacy(state.privacyMode);
bindTemplateEvents();