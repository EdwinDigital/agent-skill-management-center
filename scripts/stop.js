import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const port = process.env.PORT || "4173";

try {
  const { stdout } = await execFileAsync("lsof", ["-tiTCP:" + port, "-sTCP:LISTEN"]);
  const pids = stdout
    .split(/\s+/)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!pids.length) {
    console.log(`No service is listening on port ${port}.`);
    process.exit(0);
  }

  for (const pid of pids) {
    process.kill(pid, "SIGTERM");
    console.log(`Stopped service on port ${port} (PID ${pid}).`);
  }
} catch (error) {
  if (error.code === 1) {
    console.log(`No service is listening on port ${port}.`);
    process.exit(0);
  }
  console.error(`Failed to stop service on port ${port}: ${error.message}`);
  process.exit(1);
}
