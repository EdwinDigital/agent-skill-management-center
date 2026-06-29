const WORKBENCH_STORAGE_KEYS = {
  theme: "workbenchTemplateTheme",
  sidebarCollapsed: "workbenchTemplateSidebarCollapsed",
  docCollapsed: "workbenchTemplateDocCollapsed",
};

const state = {
  theme: localStorage.getItem(WORKBENCH_STORAGE_KEYS.theme) || "light",
  sidebarCollapsed: localStorage.getItem(WORKBENCH_STORAGE_KEYS.sidebarCollapsed) === "1",
  docCollapsed: localStorage.getItem(WORKBENCH_STORAGE_KEYS.docCollapsed) !== "0",
  graphZoom: 1,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function applyTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.body.classList.toggle("theme-dark", state.theme === "dark");
  localStorage.setItem(WORKBENCH_STORAGE_KEYS.theme, state.theme);
  const themeToggle = $("#theme-toggle");
  if (themeToggle) {
    themeToggle.textContent = state.theme === "dark" ? "☼" : "☾";
  }
}

function applyShellState() {
  const shell = $(".workbench-shell");
  const docPanel = $(".doc-panel");
  if (!shell || !docPanel) return;

  shell.dataset.sidebarCollapsed = state.sidebarCollapsed ? "true" : "false";
  shell.dataset.docCollapsed = state.docCollapsed ? "true" : "false";
  docPanel.classList.toggle("is-collapsed", state.docCollapsed);

  $("#sidebar-collapse")?.setAttribute("aria-expanded", state.sidebarCollapsed ? "false" : "true");
  $("#sidebar-expand")?.setAttribute("aria-expanded", state.sidebarCollapsed ? "false" : "true");
  $("#doc-expand")?.setAttribute("aria-expanded", state.docCollapsed ? "false" : "true");
  $("#doc-collapse")?.setAttribute("aria-expanded", state.docCollapsed ? "false" : "true");
}

function setSidebarCollapsed(collapsed) {
  state.sidebarCollapsed = Boolean(collapsed);
  localStorage.setItem(WORKBENCH_STORAGE_KEYS.sidebarCollapsed, state.sidebarCollapsed ? "1" : "0");
  applyShellState();
}

function setDocCollapsed(collapsed) {
  state.docCollapsed = Boolean(collapsed);
  localStorage.setItem(WORKBENCH_STORAGE_KEYS.docCollapsed, state.docCollapsed ? "1" : "0");
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

function setActiveDocTab(tabName) {
  $$(".doc-tab").forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  $$('[data-panel]').forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== tabName);
  });
}

function setGraphZoom(nextZoom) {
  state.graphZoom = Math.min(1.45, Math.max(0.7, Number(nextZoom.toFixed(2))));
  const graphContent = $(".graph-scroll");
  const zoomLabel = $("#zoom-label");
  if (graphContent) {
    graphContent.style.setProperty("--graph-zoom", state.graphZoom);
    $$(".graph-node", graphContent).forEach((node) => {
      node.style.transform = `scale(${state.graphZoom})`;
      node.style.transformOrigin = "top left";
    });
    const lines = $(".graph-lines", graphContent);
    if (lines) {
      lines.style.transform = `scale(${state.graphZoom})`;
      lines.style.transformOrigin = "top left";
    }
  }
  if (zoomLabel) {
    zoomLabel.textContent = `${Math.round(state.graphZoom * 100)}%`;
  }
}

function bindGraphDrag() {
  const graphScroll = $(".graph-scroll");
  if (!graphScroll) return;

  let drag = null;
  graphScroll.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button")) return;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: graphScroll.scrollLeft,
      scrollTop: graphScroll.scrollTop,
    };
    graphScroll.setPointerCapture(event.pointerId);
    graphScroll.classList.add("is-dragging");
  });

  graphScroll.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    graphScroll.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
    graphScroll.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
  });

  const endDrag = (event) => {
    if (drag?.pointerId === event.pointerId) {
      drag = null;
    }
    if (graphScroll.hasPointerCapture(event.pointerId)) {
      graphScroll.releasePointerCapture(event.pointerId);
    }
    graphScroll.classList.remove("is-dragging");
  };

  graphScroll.addEventListener("pointerup", endDrag);
  graphScroll.addEventListener("pointercancel", endDrag);
  graphScroll.addEventListener("pointerleave", endDrag);
}

function bindWorkbenchEvents() {
  $("#theme-toggle")?.addEventListener("click", () => applyTheme(state.theme === "dark" ? "light" : "dark"));
  $("#sidebar-collapse")?.addEventListener("click", () => setSidebarCollapsed(true));
  $("#sidebar-expand")?.addEventListener("click", () => setSidebarCollapsed(false));
  $("#doc-expand")?.addEventListener("click", () => setDocCollapsed(false));
  $("#doc-collapse")?.addEventListener("click", () => setDocCollapsed(true));

  const settingsDialog = $("#settings-dialog");
  $("#settings-open")?.addEventListener("click", () => openDialog(settingsDialog));
  $$('[data-dialog-close]').forEach((element) => {
    element.addEventListener("click", () => closeDialog(settingsDialog));
  });

  $$(".doc-tab").forEach((tab) => {
    tab.addEventListener("click", () => setActiveDocTab(tab.dataset.tab || "skill"));
  });

  $("#clear-search")?.addEventListener("click", () => {
    const input = $("#skill-search");
    if (input) {
      input.value = "";
      input.focus();
    }
  });

  $$('[data-skill-row]').forEach((row) => {
    row.addEventListener("click", () => {
      $$('[data-skill-row]').forEach((item) => {
        item.classList.remove("is-selected");
        item.setAttribute("aria-selected", "false");
      });
      row.classList.add("is-selected");
      row.setAttribute("aria-selected", "true");
    });
  });

  $("#zoom-out")?.addEventListener("click", () => setGraphZoom(state.graphZoom - 0.1));
  $("#zoom-in")?.addEventListener("click", () => setGraphZoom(state.graphZoom + 0.1));
  $("#zoom-reset")?.addEventListener("click", () => setGraphZoom(1));

  bindGraphDrag();
}

applyTheme(state.theme);
applyShellState();
setGraphZoom(state.graphZoom);
bindWorkbenchEvents();
