import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const setupDirectory = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(setupDirectory, "default-skill-directories.csv");

export const supportedAgentSkillDirectories = parseDefaultSkillDirectoriesCsv(
  fsSync.readFileSync(csvPath, "utf8")
);

function parseDefaultSkillDirectoriesCsv(content) {
  const rows = parseCsvRows(content).filter((row) => row.some((cell) => cell.trim() !== ""));
  const [header, ...records] = rows;
  const expectedHeader = ["agent_name", "agent_slug", "project_path", "global_path"];
  if (!header || header.join(",") !== expectedHeader.join(",")) {
    throw new Error(`Invalid default skill directories CSV header in ${csvPath}`);
  }

  return records.map((row, index) => {
    if (row.length !== expectedHeader.length) {
      throw new Error(`Invalid default skill directories CSV row ${index + 2} in ${csvPath}`);
    }
    return row;
  });
}

function parseCsvRows(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (inQuotes) {
    throw new Error(`Invalid default skill directories CSV quoting in ${csvPath}`);
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
