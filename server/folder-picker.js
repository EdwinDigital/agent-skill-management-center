import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function pickLocalSkillRoot({
  platform = process.platform,
  executeFile = execFileAsync,
  windowsDirectory = process.env.SystemRoot || process.env.WINDIR || "C:\\Windows",
  initialDirectory,
  language = "en"
} = {}) {
  let executable;
  let args;
  const options = { timeout: 120_000 };

  if (platform === "win32") {
    executable = path.win32.join(windowsDirectory, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const script = fs.readFileSync(new URL("./folder-picker.ps1", import.meta.url), "utf8");
    args = ["-NoLogo", "-NoProfile", "-NonInteractive", "-STA", "-WindowStyle", "Hidden", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")];
    options.windowsHide = true;
    options.encoding = "utf8";
    if (initialDirectory) {
      options.env = { ...process.env, AGENT_SMC_FOLDER_PICKER_INITIAL_PATH: initialDirectory };
    }
  } else if (platform === "darwin") {
    executable = "osascript";
    args = ["-e", 'POSIX path of (choose folder with prompt "Choose a Skill directory")'];
  } else {
    throw new Error("Native folder selection is not supported on this platform.");
  }

  let stdout;
  try {
    ({ stdout } = await executeFile(executable, args, options));
  } catch (error) {
    if (platform === "darwin" && !error.killed && /\(-128\)/.test(`${error.stderr || ""}\n${error.message || ""}`)) {
      return null;
    }
    const timedOut = error.killed || error.signal === "SIGTERM" || error.code === "ETIMEDOUT";
    const message = language === "zh"
      ? timedOut ? "目录选择超时。请重试，或直接输入目录路径。" : "无法打开系统目录选择器，请直接输入目录路径。"
      : timedOut ? "Directory selection timed out. Try again or enter the path manually." : "Unable to open the system folder picker. Enter the path manually.";
    throw Object.assign(new Error(message, { cause: error }), { code: timedOut ? "DIRECTORY_PICKER_TIMEOUT" : "DIRECTORY_PICKER_FAILED" });
  }

  const selectedPath = String(stdout || "").replace(/^\uFEFF/, "").trim();
  if (!selectedPath) return null;
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  if (!pathApi.isAbsolute(selectedPath)) {
    throw new Error("The folder picker did not return an absolute directory path.");
  }
  return pathApi.resolve(selectedPath);
}
