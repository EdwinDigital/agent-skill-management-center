import os from "node:os";
import path from "node:path";

export function expandHomePath(value, homeDir = os.homedir(), pathApi = path) {
  const text = String(value || "");
  return /^~[\\/]/.test(text) ? pathApi.join(homeDir, text.slice(2)) : text;
}

export function resolveProjectPath(value, { cwd = process.cwd(), homeDir = os.homedir(), pathApi = path } = {}) {
  const expanded = expandHomePath(value, homeDir, pathApi);
  return pathApi.isAbsolute(expanded) ? pathApi.normalize(expanded) : pathApi.resolve(cwd, expanded);
}

export function normalizeScanPath(value, sourceType, options = {}) {
  return sourceType === "browser" ? String(value) : resolveProjectPath(value, options);
}