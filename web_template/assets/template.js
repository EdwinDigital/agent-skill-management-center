const STORAGE_KEYS = {
  theme: "templateTheme",
  sidebarCollapsed: "templateSidebarCollapsed",
  skillDocCollapsed: "templateSkillDocCollapsed",
};

const state = {
  theme: localStorage.getItem(STORAGE_KEYS.theme) || "light",
  sidebarCollapsed: localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === "1",
  skillDocCollapsed: localStorage.getItem(STORAGE_KEYS.skillDocCollapsed) !== "0",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function applyTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.body.classList.toggle("theme-dark", state.theme === "dark");
  localStorage.setItem(STORAGE_KEYS.theme, state.theme);
}

function applyShellState() {
  const shell = $(".app-shell");
  const skillDocPanel = $(".skill-doc-panel");
  if (!shell || !skillDocPanel) return;

  shell.dataset.sidebarCollapsed = state.sidebarCollapsed ? "true" : "false";
  shell.dataset.skillDocCollapsed = state.skillDocCollapsed ? "true" : "false";
  skillDocPanel.classList.toggle("is-collapsed", state.skillDocCollapsed);

  $("#sidebar-toggle")?.setAttribute("aria-expanded", state.sidebarCollapsed ? "false" : "true");
  $("#sidebar-expand")?.setAttribute("aria-expanded", state.sidebarCollapsed ? "false" : "true");
  $("#skill-doc-toggle")?.setAttribute("aria-expanded", state.skillDocCollapsed ? "false" : "true");
  $("#skill-doc-expand")?.setAttribute("aria-expanded", state.skillDocCollapsed ? "false" : "true");
  $("#skill-doc-collapse")?.setAttribute("aria-expanded", state.skillDocCollapsed ? "false" : "true");
}

function setSidebarCollapsed(collapsed) {
  state.sidebarCollapsed = Boolean(collapsed);
  localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, state.sidebarCollapsed ? "1" : "0");
  applyShellState();
}

function setSkillDocCollapsed(collapsed) {
  state.skillDocCollapsed = Boolean(collapsed);
  localStorage.setItem(STORAGE_KEYS.skillDocCollapsed, state.skillDocCollapsed ? "1" : "0");
  applyShellState();
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
  $("#sidebar-toggle")?.addEventListener("click", () => setSidebarCollapsed(true));
  $("#sidebar-expand")?.addEventListener("click", () => setSidebarCollapsed(false));
  $("#skill-doc-toggle")?.addEventListener("click", () => setSkillDocCollapsed(!state.skillDocCollapsed));
  $("#skill-doc-expand")?.addEventListener("click", () => setSkillDocCollapsed(false));
  $("#skill-doc-collapse")?.addEventListener("click", () => setSkillDocCollapsed(true));

  const settingsDialog = $("#settings-dialog");
  $("#settings-open")?.addEventListener("click", () => openDialog(settingsDialog));
  $$('[data-dialog-close]').forEach((element) => {
    element.addEventListener("click", () => closeDialog(settingsDialog));
  });
  $("#settings-save")?.addEventListener("click", () => closeDialog(settingsDialog));
}

applyTheme(state.theme);
applyShellState();
bindTemplateEvents();