import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const pidFile = "/tmp/doen.pid";
const logFile = "/tmp/doen.log";

function isRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}

async function main() {
  const action = process.argv[2];
  if (action !== "start" && action !== "stop") {
    throw new Error("Usage: bun scripts/dev-background.ts start|stop");
  }

  const pid = fs.existsSync(pidFile)
    ? Number(fs.readFileSync(pidFile, "utf8").trim())
    : NaN;
  const running = Number.isSafeInteger(pid) && pid > 1 && isRunning(pid);

  if (action === "stop") {
    if (running) {
      // Stop the whole detached group, including Next.js child processes.
      process.kill(-pid, "SIGTERM");
      for (let attempt = 0; attempt < 50 && isRunning(-pid); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (isRunning(-pid)) process.kill(-pid, "SIGKILL");
    }
    fs.rmSync(pidFile, { force: true });
    console.log(running ? "Stopped background dev server." : "No background dev server running.");
    return;
  }

  if (running) {
    console.log(`Dev server already running (PID ${pid}). Logs: ${logFile}`);
    return;
  }

  fs.rmSync(pidFile, { force: true });
  const log = fs.openSync(logFile, "w");
  const child = spawn(process.execPath, ["run", "dev"], {
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    detached: true,
    stdio: ["ignore", log, log],
  });
  fs.closeSync(log);
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  if (child.pid === undefined) throw new Error("Dev server did not return a PID.");
  fs.writeFileSync(pidFile, `${child.pid}\n`);
  child.unref();

  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (!isRunning(child.pid)) {
    fs.rmSync(pidFile, { force: true });
    throw new Error(`Dev server failed to start. See ${logFile}`);
  }
  console.log(`Started background dev server (PID ${child.pid}). Logs: ${logFile}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
