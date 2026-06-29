import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const sourceIconPath = path.join(projectRoot, "src-tauri", "icons", "128x128@2x.png");
const dmgDirectory = path.join(projectRoot, "src-tauri", "target", "release", "bundle", "dmg");
const releaseDirectory = path.join(projectRoot, "release");

const dmgPath = findLatestDmg(dmgDirectory);
const releaseDmgPath = path.join(releaseDirectory, path.basename(dmgPath));

fs.mkdirSync(releaseDirectory, { recursive: true });
applyCustomFinderIcon(dmgPath, sourceIconPath);
fs.copyFileSync(dmgPath, releaseDmgPath);
applyCustomFinderIcon(releaseDmgPath, sourceIconPath);

console.log(`Prepared DMG with Finder icon: ${path.relative(projectRoot, releaseDmgPath)}`);

function findLatestDmg(directory) {
  const candidates = fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".dmg"))
    .map((fileName) => {
      const filePath = path.join(directory, fileName);
      return { filePath, modifiedAt: fs.statSync(filePath).mtimeMs };
    })
    .sort((left, right) => right.modifiedAt - left.modifiedAt);

  if (!candidates.length) {
    throw new Error(`No DMG found in ${directory}`);
  }
  return candidates[0].filePath;
}

function applyCustomFinderIcon(targetPath, iconPath) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-smc-dmg-icon-"));
  const temporaryIconPath = path.join(temporaryDirectory, "icon.png");
  const temporaryResourcePath = path.join(temporaryDirectory, "icon.rsrc");

  try {
    fs.copyFileSync(iconPath, temporaryIconPath);
    execFileSync("sips", ["-i", temporaryIconPath], { stdio: "ignore" });
    const iconResource = execFileSync("DeRez", ["-only", "icns", temporaryIconPath]);
    fs.writeFileSync(temporaryResourcePath, iconResource);
    execFileSync("Rez", ["-append", temporaryResourcePath, "-o", targetPath], { stdio: "ignore" });
    execFileSync("SetFile", ["-a", "C", targetPath], { stdio: "ignore" });
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}