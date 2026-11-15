import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const APP_NAME = "doen";
const APP_PORT = 41741;
const PROXY_PORT = Number(process.env.PORTLESS_PORT ?? 1355);
const PUBLIC_URL = `http://${APP_NAME}.local:${PROXY_PORT}`;
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function detectLanIp(): string | undefined {
  const addresses = Object.values(os.networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address);
  return addresses.find(isPrivateLanIp) ?? addresses[0];
}

function isPrivateLanIp(address: string): boolean {
  if (address.startsWith("10.")) return true;
  if (address.startsWith("192.168.")) return true;
  const match = /^172\.(\d+)\./.exec(address);
  return match !== null && Number(match[1]) >= 16 && Number(match[1]) <= 31;
}

function runPortless(args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("portless", args, {
      cwd: projectRoot,
      env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function ensureProxy(lanIp: string, env: NodeJS.ProcessEnv): Promise<void> {
  const startArgs = [
    "proxy",
    "start",
    "--no-tls",
    "--lan",
    "--ip",
    lanIp,
    "-p",
    String(PROXY_PORT),
  ];

  let code = await runPortless(startArgs, env);
  if (code !== 0) {
    // A proxy is running with a different config (e.g. the LAN IP changed
    // after switching networks). Restart it; alias routes persist on disk.
    await runPortless(["proxy", "stop", "-p", String(PROXY_PORT)], env);
    code = await runPortless(startArgs, env);
  }
  if (code !== 0) {
    throw new Error("Failed to start the portless proxy.");
  }
}

async function main() {
  const lanIp = process.env.PORTLESS_LAN_IP ?? detectLanIp();
  if (!lanIp) {
    throw new Error("No LAN IPv4 address found. Set PORTLESS_LAN_IP and retry.");
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(APP_PORT),
    BETTER_AUTH_URL: PUBLIC_URL,
    PORTLESS_HTTPS: "0",
    PORTLESS_LAN: "1",
    PORTLESS_LAN_IP: lanIp,
    PORTLESS_PORT: String(PROXY_PORT),
  };
  delete env.PORTLESS_STATE_DIR;

  await ensureProxy(lanIp, env);

  const aliasCode = await runPortless(
    ["alias", APP_NAME, String(APP_PORT), "--force"],
    env,
  );
  if (aliasCode !== 0) {
    throw new Error("Failed to register the portless alias.");
  }

  const hosts = fs.existsSync("/etc/hosts")
    ? fs.readFileSync("/etc/hosts", "utf8")
    : "";
  if (!hosts.includes(`${APP_NAME}.local`)) {
    const synced = await runPortless(["hosts", "sync"], env).catch(() => 1);
    if (synced !== 0) {
      console.warn(
        `Could not add ${APP_NAME}.local to /etc/hosts (sudo required). ` +
          `Run \`portless hosts sync\` manually in a terminal.`,
      );
    }
  }

  if (await isPortOpen(APP_PORT)) {
    throw new Error(
      `Port ${APP_PORT} is already in use. ` +
        `Free it first, otherwise the ${APP_NAME}.local route points at the wrong process.`,
    );
  }

  console.log(`Starting Doen dev server at ${PUBLIC_URL}`);
  const child = spawn(process.execPath, ["run", "dev"], {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => child.kill(signal));
  }
  process.exitCode = await new Promise<number>((resolve) => {
    child.once("error", (error) => {
      console.error(error.message);
      resolve(1);
    });
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
