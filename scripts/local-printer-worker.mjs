import fs from "fs/promises";
import os from "os";
import path from "path";
import net from "net";
import process from "process";
import { randomUUID } from "crypto";

const DEFAULT_BASE_URL = process.env.PRINTER_BASE_URL || "http://www.shishapoint.site";
const DEFAULT_USERNAME = process.env.PRINTER_USERNAME || "printer";
const DEFAULT_PASSWORD = process.env.PRINTER_PASSWORD || "printer123";
const DEFAULT_POLL_MS = Math.max(1000, Number(process.env.PRINTER_WORKER_POLL_MS || 3000) || 3000);
const DEFAULT_LEASE_MS = Math.max(5000, Number(process.env.PRINTER_WORKER_LEASE_MS || 15000) || 15000);
const DEFAULT_LOCK_FILE =
  process.env.PRINTER_WORKER_LOCK_FILE || path.join(os.homedir(), ".digital-menu-printer-worker.json");
const SETTINGS_REFRESH_MS = Math.max(
  5000,
  Number(process.env.PRINTER_WORKER_SETTINGS_REFRESH_MS || 30000) || 30000,
);

function log(message) {
  console.log(`[local-printer-worker] ${new Date().toISOString()} ${message}`);
}

function usage() {
  console.log(`Usage: node scripts/local-printer-worker.mjs [options]

Options:
  --base-url <url>     Hosted app base URL (default: ${DEFAULT_BASE_URL})
  --username <name>    Printer username (default: ${DEFAULT_USERNAME})
  --password <value>   Printer password (default: current env/default)
  --poll-ms <ms>       Fallback poll interval in milliseconds (default: ${DEFAULT_POLL_MS})
  --lease-ms <ms>      Printer lock lease in milliseconds (default: ${DEFAULT_LEASE_MS})
  --lock-file <path>   Persisted lock token file (default: ${DEFAULT_LOCK_FILE})
  --once               Run a single claim/print cycle and exit
  --help               Show this message
`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    username: DEFAULT_USERNAME,
    password: DEFAULT_PASSWORD,
    pollMs: DEFAULT_POLL_MS,
    leaseMs: DEFAULT_LEASE_MS,
    lockFile: DEFAULT_LOCK_FILE,
    once: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg === "--once") {
      options.once = true;
      continue;
    }

    const next = argv[i + 1];
    if (!next) {
      throw new Error(`Missing value for ${arg}`);
    }

    switch (arg) {
      case "--base-url":
        options.baseUrl = next;
        i += 1;
        break;
      case "--username":
        options.username = next;
        i += 1;
        break;
      case "--password":
        options.password = next;
        i += 1;
        break;
      case "--poll-ms":
        options.pollMs = Math.max(1000, Number(next) || DEFAULT_POLL_MS);
        i += 1;
        break;
      case "--lease-ms":
        options.leaseMs = Math.max(5000, Number(next) || DEFAULT_LEASE_MS);
        i += 1;
        break;
      case "--lock-file":
        options.lockFile = next;
        i += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.baseUrl = options.baseUrl.replace(/\/+$/, "");
  return options;
}

async function ensureParentDirectory(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function loadOrCreateLockToken(lockFile) {
  await ensureParentDirectory(lockFile);
  try {
    const raw = await fs.readFile(lockFile, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lockToken === "string" && parsed.lockToken.trim().length > 0) {
      return parsed.lockToken.trim();
    }
  } catch {
    // Fall through to create a new token.
  }

  const lockToken = randomUUID();
  await fs.writeFile(lockFile, JSON.stringify({ lockToken }, null, 2), "utf8");
  return lockToken;
}

function createHttpError(status, message, body) {
  const error = new Error(message || `HTTP ${status}`);
  error.status = status;
  error.body = body;
  return error;
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isLockError(error) {
  const status = Number(error?.status || 0);
  const message = String(error?.message || "").toLowerCase();
  return status === 409 || message.includes("lock");
}

function isUnauthorizedError(error) {
  return Number(error?.status || 0) === 401;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendToNetworkPrinter(host, port, content) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      const feedCommand = "\x1Bd\x05";
      const cutCommand = "\x1dV\x00";
      socket.write(content, "latin1");
      socket.write(feedCommand, "binary");
      socket.write(cutCommand, "binary");
      socket.end();
    });
    socket.setTimeout(7000);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Printer connection timed out"));
    });
    socket.on("error", (error) => reject(error));
    socket.on("close", () => resolve());
  });
}

function createWorker(options) {
  const state = {
    token: "",
    lockToken: "",
    hasLock: false,
    shuttingDown: false,
    lastSettingsAt: 0,
    settings: null,
    lastIdleLoggedAt: 0,
  };

  const holder = `${options.username}@${os.hostname()}:worker`;

  async function login() {
    const response = await fetch(`${options.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: options.username,
        password: options.password,
      }),
    });
    const body = await parseResponseBody(response);
    if (!response.ok || typeof body?.token !== "string") {
      throw createHttpError(
        response.status,
        body?.message || `Login failed (${response.status})`,
        body,
      );
    }
    state.token = body.token;
    log(`Logged in as ${body.user?.username || options.username}.`);
    return body;
  }

  async function apiRequest(method, route, body, allowRelogin = true) {
    const headers = {};
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${options.baseUrl}${route}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const parsed = await parseResponseBody(response);

    if (response.status === 401 && allowRelogin && route !== "/api/auth/login") {
      state.token = "";
      await login();
      return apiRequest(method, route, body, false);
    }

    if (!response.ok) {
      throw createHttpError(
        response.status,
        parsed?.message || (typeof parsed === "string" ? parsed : `${response.status} ${response.statusText}`),
        parsed,
      );
    }

    return parsed;
  }

  async function refreshSettings(force = false) {
    const stale = Date.now() - state.lastSettingsAt > SETTINGS_REFRESH_MS;
    if (!force && state.settings && !stale) {
      return state.settings;
    }
    state.settings = await apiRequest("GET", "/api/printer/settings");
    state.lastSettingsAt = Date.now();
    return state.settings;
  }

  async function acquireLock() {
    try {
      const result = await apiRequest("POST", "/api/printer/lock/acquire", {
        lockToken: state.lockToken,
        holder,
        leaseMs: options.leaseMs,
      });
      state.hasLock = true;
      log(`Printer lock acquired as ${result?.lockHolder || holder}.`);
      return true;
    } catch (error) {
      state.hasLock = false;
      if (Number(error?.status || 0) === 409) {
        const lockHolder = error?.body?.lockHolder || "another client";
        const lockExpiresAt = error?.body?.lockExpiresAt;
        const expiresText = lockExpiresAt ? ` until ${new Date(lockExpiresAt).toLocaleTimeString()}` : "";
        log(`Printer lock busy: ${lockHolder}${expiresText}.`);
        return false;
      }
      throw error;
    }
  }

  async function releaseLock(reason) {
    if (!state.hasLock) return;
    try {
      await apiRequest(
        "POST",
        "/api/printer/lock/release",
        { lockToken: state.lockToken },
        false,
      );
      log(`Printer lock released (${reason}).`);
    } catch (error) {
      log(`Failed to release printer lock: ${error.message}`);
    } finally {
      state.hasLock = false;
    }
  }

  async function sendHeartbeat(status, errorMessage) {
    if (!state.hasLock) return;
    try {
      await apiRequest("POST", "/api/printer/heartbeat", {
        status,
        errorMessage,
        lockToken: state.lockToken,
      });
    } catch (error) {
      if (isLockError(error)) {
        state.hasLock = false;
        log("Printer lock expired while sending heartbeat.");
        return;
      }
      if (!isUnauthorizedError(error)) {
        log(`Heartbeat failed: ${error.message}`);
      }
    }
  }

  async function markJobComplete(jobId) {
    await apiRequest("POST", `/api/printer/jobs/${jobId}/complete`, {
      lockToken: state.lockToken,
    });
  }

  async function markJobFailed(jobId, errorMessage) {
    await apiRequest("POST", `/api/printer/jobs/${jobId}/fail`, {
      lockToken: state.lockToken,
      errorMessage,
    });
  }

  async function handleJob(job) {
    if (!job?.printerIp || !job?.printerPort || !job?.receipt) {
      throw new Error("Claimed job payload is incomplete.");
    }

    log(`Printing order ${job.orderId} (job ${job.id}) to ${job.printerIp}:${job.printerPort}...`);
    try {
      await sendToNetworkPrinter(job.printerIp, job.printerPort, job.receipt);
      await markJobComplete(job.id);
      await sendHeartbeat("printed");
      log(`Printed order ${job.orderId} (job ${job.id}).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown printer error";
      try {
        await markJobFailed(job.id, message);
      } catch (reportError) {
        log(`Could not report failed job ${job.id}: ${reportError.message}`);
      }
      await sendHeartbeat("error", message);
      log(`Print failed for job ${job.id}: ${message}`);
    }
  }

  async function maybeLogIdle(settings) {
    const now = Date.now();
    const interval = Math.max(5000, Number(settings?.pollIntervalMs ?? options.pollMs) || options.pollMs);
    if (now - state.lastIdleLoggedAt >= interval * 5) {
      log("Waiting for print jobs...");
      state.lastIdleLoggedAt = now;
    }
  }

  async function runCycle() {
    const settings = await refreshSettings();
    if (!settings?.enabled || !settings?.printerIp) {
      if (state.hasLock) {
        await releaseLock("printer disabled");
      }
      log("Printer is disabled or IP is not configured in server settings.");
      return;
    }

    if (!state.hasLock) {
      const acquired = await acquireLock();
      if (!acquired) return;
    }

    const data = await apiRequest("POST", "/api/printer/claim-next", {
      lockToken: state.lockToken,
    });

    if (data?.status === "job" && data.job) {
      await handleJob(data.job);
      return;
    }

    if (data?.status === "idle") {
      await sendHeartbeat("idle");
      await maybeLogIdle(settings);
      return;
    }

    throw new Error(data?.message || "Unknown claim-next response");
  }

  async function run() {
    state.lockToken = await loadOrCreateLockToken(options.lockFile);
    log(`Worker starting for ${options.baseUrl} as ${options.username}.`);
    log(`Using lock token file: ${options.lockFile}`);

    while (!state.shuttingDown) {
      try {
        if (!state.token) {
          await login();
        }
        await runCycle();
        if (options.once) {
          break;
        }
      } catch (error) {
        if (isLockError(error)) {
          state.hasLock = false;
          log(`Lock error: ${error.message}`);
        } else if (isUnauthorizedError(error)) {
          state.token = "";
          log("Authentication expired. Reconnecting...");
        } else {
          log(`Worker error: ${error.message}`);
        }
      }

      if (state.shuttingDown) {
        break;
      }

      const intervalMs = Math.max(1000, Number(state.settings?.pollIntervalMs ?? options.pollMs) || options.pollMs);
      await sleep(intervalMs);
    }

    await releaseLock("shutdown");
    log("Worker stopped.");
  }

  async function shutdown(signal) {
    if (state.shuttingDown) return;
    state.shuttingDown = true;
    log(`Received ${signal}, shutting down...`);
  }

  return { run, shutdown };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const worker = createWorker(options);

  process.on("SIGINT", () => {
    worker.shutdown("SIGINT").catch((error) => {
      log(`Shutdown error: ${error.message}`);
    });
  });
  process.on("SIGTERM", () => {
    worker.shutdown("SIGTERM").catch((error) => {
      log(`Shutdown error: ${error.message}`);
    });
  });

  await worker.run();
}

main().catch((error) => {
  console.error(`[local-printer-worker] ${new Date().toISOString()} Fatal: ${error.message}`);
  process.exit(1);
});
