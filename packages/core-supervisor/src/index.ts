#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseCommand, printUsage } from "./cli-parser";
import {
  resolveCoreEntryPoint,
  tryResolveCoreRuntime,
} from "./core-runtime-resolver";
import { CoreManagerLock } from "./state/core-lock";
import {
  clearCorePortPreference,
  recordCorePortPreference,
} from "./state/runtime-registry";

export type { CliOptions as SupervisorClientOptions } from "./cli-parser";
export type { CoreRuntimeInfo } from "./core-runtime-resolver";

type CliOptions = import("./cli-parser").CliOptions;
type CoreRuntimeInfo = import("./core-runtime-resolver").CoreRuntimeInfo;

export interface SupervisorLogger {
  readonly error?: (message: string) => void;
  readonly info?: (message: string) => void;
}

export interface SupervisorHealth {
  readonly pid?: number;
  readonly status: string;
  readonly version?: string;
}

const HEALTH_PATH = "/api/v1/health";
const SHUTDOWN_PATH = "/api/v1/shutdown";
const HTTP_TIMEOUT_MS = 2000;

const appendNewlineIfMissing = (
  writer: (chunk: string) => void,
  message: string
): void => {
  if (message.endsWith("\n")) {
    writer(message);
    return;
  }
  writer(`${message}\n`);
};

const logInfo = (
  logger: SupervisorLogger | undefined,
  message: string
): void => {
  if (logger?.info) {
    logger.info(message);
    return;
  }
  appendNewlineIfMissing((chunk) => process.stdout.write(chunk), message);
};

const logError = (
  logger: SupervisorLogger | undefined,
  message: string
): void => {
  if (logger?.error) {
    logger.error(message);
    return;
  }
  appendNewlineIfMissing((chunk) => process.stderr.write(chunk), message);
};

const buildCoreProcessEnv = (
  options: CliOptions,
  runtime?: CoreRuntimeInfo
): NodeJS.ProcessEnv => {
  const home = os.homedir();
  const defaultWorkspace = path.join(home, "VSCODE", "CodeAI-Hub");
  const version = runtime?.version;

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CORE_HOST: options.host,
    CORE_PORT: `${options.port}`,
    CORE_MANAGED_MODE: "cli",
    CLAUDE_WORKSPACE_PATH: defaultWorkspace,
    CODEX_WORKSPACE_PATH: defaultWorkspace,
    CODEX_SKIP_GIT_REPO_CHECK: "true",
  };

  const logDir = path.join(home, ".codeai-hub", "logs", "core");
  try {
    mkdirSync(logDir, { recursive: true });
    env.CODEAI_CORE_LOG_FILE = path.join(logDir, "core.log");
  } catch {
    // fall back to stdout-only logging
  }

  if (version) {
    const providersRoot = path.join(home, ".codeai-hub", "providers");
    env.CLAUDE_MODULE_PATH = path.join(providersRoot, "claude", version);
    env.CODEX_MODULE_PATH = path.join(providersRoot, "codex", version);
  }

  return env;
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });

const fetchWithTimeout = async (
  url: string,
  init?: RequestInit
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const readHealth = async (
  options: CliOptions
): Promise<SupervisorHealth | null> => {
  try {
    const response = await fetchWithTimeout(
      `http://${options.host}:${options.port}${HEALTH_PATH}`
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as SupervisorHealth;
  } catch {
    return null;
  }
};

const waitForHealthy = async (
  options: CliOptions,
  attempts = 20,
  delayMs = 500
): Promise<boolean> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const health = await readHealth(options);
    if (health?.status === "ok") {
      return true;
    }
    await delay(delayMs);
  }
  return false;
};

export const startCore = async (
  options: CliOptions,
  logger?: SupervisorLogger
): Promise<void> => {
  const alreadyRunning = await readHealth(options);
  if (alreadyRunning?.status === "ok") {
    logInfo(
      logger,
      `[core-supervisor] Core already running at http://${options.host}:${options.port} (pid ${alreadyRunning.pid ?? "unknown"}).`
    );
    await recordCorePortPreference(options.port);
    return;
  }

  const lock = new CoreManagerLock("core-supervisor-cli");
  const acquisition = lock.acquire();
  if (!acquisition.acquired) {
    logInfo(
      logger,
      `[core-supervisor] Core start skipped: managed by ${acquisition.owner ?? "another manager"}.`
    );
    return;
  }

  try {
    const runtime = tryResolveCoreRuntime();
    let child: ReturnType<typeof spawn>;

    if (runtime) {
      child = spawn(runtime.nodePath, [runtime.entryPoint], {
        detached: true,
        stdio: "ignore",
        cwd: runtime.appDir,
        env: buildCoreProcessEnv(options, runtime),
      });
      logInfo(
        logger,
        `[core-supervisor] Starting CodeAI Hub core runtime ${runtime.version} (${runtime.platformKey}) from ${runtime.runtimeDir}...`
      );
    } else {
      const entryPoint = resolveCoreEntryPoint();
      child = spawn(process.execPath, [entryPoint], {
        detached: true,
        stdio: "ignore",
        env: buildCoreProcessEnv(options),
      });
      logInfo(
        logger,
        "[core-supervisor] Starting CodeAI Hub core from @codeai-hub/core workspace entry point..."
      );
    }

    child.unref();

    logInfo(
      logger,
      `[core-supervisor] Core process launched (pid ${child.pid ?? "unknown"}). Waiting for health checks...`
    );

    const ready = await waitForHealthy(options);
    if (!ready) {
      throw new Error(
        `Core did not become healthy via ${HEALTH_PATH}. Check logs and try again.`
      );
    }
    await recordCorePortPreference(options.port);
    logInfo(
      logger,
      `[core-supervisor] Core is ready at http://${options.host}:${options.port}.`
    );
  } finally {
    lock.release();
  }
};

export const stopCore = async (
  options: CliOptions,
  logger?: SupervisorLogger
): Promise<void> => {
  const healthBefore = await readHealth(options);
  if (!healthBefore) {
    logInfo(
      logger,
      `[core-supervisor] Core is not running at http://${options.host}:${options.port}.`
    );
    return;
  }

  logInfo(
    logger,
    `[core-supervisor] Requesting shutdown for pid ${healthBefore.pid ?? "unknown"}...`
  );
  const response = await fetchWithTimeout(
    `http://${options.host}:${options.port}${SHUTDOWN_PATH}`,
    {
      method: "POST",
    }
  );
  if (!response.ok) {
    throw new Error(`Shutdown request failed with status ${response.status}.`);
  }

  const stopped = await waitForShutdown(options);
  if (!stopped) {
    throw new Error("Core did not stop gracefully within the expected window.");
  }
  await clearCorePortPreference();
  logInfo(logger, "[core-supervisor] Core stopped successfully.");
};

const printStatus = async (
  options: CliOptions,
  logger?: SupervisorLogger
): Promise<void> => {
  const health = await readHealth(options);
  if (!health) {
    logInfo(
      logger,
      `[core-supervisor] Core is not reachable at http://${options.host}:${options.port}.`
    );
    return;
  }

  logInfo(
    logger,
    JSON.stringify(
      {
        endpoint: `http://${options.host}:${options.port}`,
        ...health,
      },
      null,
      2
    )
  );
};

const waitForShutdown = async (
  options: CliOptions,
  attempts = 20,
  delayMs = 500
): Promise<boolean> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const health = await readHealth(options);
    if (!health || health.status !== "ok") {
      return true;
    }
    await delay(delayMs);
  }
  return false;
};

const main = async (): Promise<void> => {
  const { command, options } = parseCommand();
  switch (command) {
    case "start":
      await startCore(options);
      break;
    case "stop":
      await stopCore(options);
      break;
    case "status":
      await printStatus(options);
      break;
    default:
      printUsage();
      break;
  }
};

if (require.main === module) {
  main().catch((error) => {
    logError(
      undefined,
      `[core-supervisor] ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exit(1);
  });
}
