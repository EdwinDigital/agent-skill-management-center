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
const removedDmgs = pruneReleaseDmgs(releaseDirectory, 2);

console.log(`Prepared DMG with Finder icon: ${path.relative(projectRoot, releaseDmgPath)}`);
if (removedDmgs.length) {
  console.log(`Cleaned old release DMGs: ${removedDmgs.map((fileName) => path.join("release", fileName)).join(", ")}`);
}

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

function pruneReleaseDmgs(directory, keepCount) {
  const dmgFiles = fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".dmg"))
    .map((fileName) => {
      const filePath = path.join(directory, fileName);
      return {
        fileName,
        filePath,
        modifiedAt: fs.statSync(filePath).mtimeMs,
        version: parseDmgVersion(fileName)
      };
    })
    .sort(compareReleaseDmgFiles);

  const removed = [];
  for (const candidate of dmgFiles.slice(keepCount)) {
    fs.rmSync(candidate.filePath, { force: true });
    removed.push(candidate.fileName);
  }
  return removed;
}

function compareReleaseDmgFiles(left, right) {
  const versionComparison = compareVersions(right.version, left.version);
  if (versionComparison !== 0) {
    return versionComparison;
  }
  return right.modifiedAt - left.modifiedAt;
}

function parseDmgVersion(fileName) {
  return fileName.match(/_(\d+)\.(\d+)\.(\d+)(?:[_-]|\.dmg$)/)?.slice(1, 4).map(Number) || [0, 0, 0];
}

function compareVersions(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}