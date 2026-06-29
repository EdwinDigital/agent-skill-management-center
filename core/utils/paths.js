import os from "node:os";
import path from "node:path";

export function expandHomePath(value, homeDir = os.homedir()) {
  const text = String(value || "");
  return text.startsWith("~/") ? path.join(homeDir, text.slice(2)) : text;
}

export function resolveProjectPath(value, { cwd = process.cwd(), homeDir = os.homedir() } = {}) {
  const expanded = expandHomePath(value, homeDir);
  return path.isAbsolute(expanded) ? expanded : path.resolve(cwd, expanded);
}

export function normalizeScanPath(value, sourceType, options = {}) {
  return sourceType === "browser" ? String(value) : path.resolve(expandHomePath(value, options.homeDir));
}