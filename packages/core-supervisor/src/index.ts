#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { CoreManagerLock } from "./state/core-lock";
import {
  clearCorePortPreference,
  recordCorePortPreference,
} from "./state/runtime-registry";

type Command = "start" | "stop" | "status" | "help";

interface CliOptions {
  host: string;
  port: number;
}

interface HealthResponse {
  readonly pid?: number;
  readonly status: string;
  readonly version?: string;
}

export type SupervisorClientOptions = CliOptions;
export type SupervisorHealth = HealthResponse;

export interface SupervisorLogger {
  readonly error?: (message: string) => void;
  readonly info?: (message: string) => void;
}

type OptionName = "host" | "port";
interface OptionMatch {
  readonly name: OptionName;
  readonly value: string;
}

const SEMVER_DIRECTORY_PATTERN = /^\d+\.\d+\.\d+$/u;
const SEMVER_PART_COUNT = 3;
const DEFAULT_HOST = process.env.CORE_HOST ?? "127.0.0.1";
const DEFAULT_PORT_FALLBACK = 8080;
const DEFAULT_PORT = Number.parseInt(
  process.env.CORE_PORT ?? `${DEFAULT_PORT_FALLBACK}`,
  10
);
const HEALTH_PATH = "/api/v1/health";
const CORE_RUNTIME_ROOT = path.join(os.homedir(), ".codeai-hub", "core");
const SHUTDOWN_PATH = "/api/v1/shutdown";
const HTTP_TIMEOUT_MS = 2000;
const supervisorRequire = createRequire(
  process.argv[1] ?? path.join(process.cwd(), "package.json")
);
const INLINE_OPTION_REGEX = /^--(?<name>host|port)=(?<value>.+)$/u;
const FLAG_NAME_MAP: Record<string, OptionName> = {
  "--host": "host",
  "-H": "host",
  "--port": "port",
  "-p": "port",
};

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

const parseCommand = (): { command: Command; options: CliOptions } => {
  const args = process.argv.slice(2);
  const rawCommand = args[0];
  const commandToken =
    rawCommand && !rawCommand.startsWith("--") ? rawCommand : "help";
  const optionArgs =
    rawCommand && !rawCommand.startsWith("--") ? args.slice(1) : args;

  return {
    command: ["start", "stop", "status", "help"].includes(
      commandToken.toLowerCase()
    )
      ? (commandToken.toLowerCase() as Command)
      : "help",
    options: parseOptions(optionArgs),
  };
};

const parseOptions = (args: readonly string[]): CliOptions => {
  let host = DEFAULT_HOST;
  let port = Number.isFinite(DEFAULT_PORT)
    ? DEFAULT_PORT
    : DEFAULT_PORT_FALLBACK;
  let index = 0;

  while (index < args.length) {
    const arg = args[index];
    if (!arg) {
      index += 1;
      continue;
    }

    const inlineOption = parseInlineOption(arg);
    if (inlineOption) {
      ({ host, port } = applyOption(inlineOption, host, port));
      index += 1;
      continue;
    }

    const separateOption = parseSeparateOption(arg, args[index + 1]);
    if (separateOption) {
      ({ host, port } = applyOption(separateOption.option, host, port));
      index += separateOption.consumed;
      continue;
    }

    index += 1;
  }

  return { host, port };
};

const parsePort = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const parseInlineOption = (arg: string): OptionMatch | null => {
  const match = INLINE_OPTION_REGEX.exec(arg);
  if (!(match?.groups?.name && match.groups.value)) {
    return null;
  }
  return {
    name: match.groups.name as OptionName,
    value: match.groups.value,
  };
};

const parseSeparateOption = (
  flag: string,
  value?: string
): { option: OptionMatch; consumed: number } | null => {
  const name = FLAG_NAME_MAP[flag];
  if (!(name && value) || value.startsWith("--")) {
    return null;
  }
  return {
    option: {
      name,
      value,
    },
    consumed: 2,
  };
};

const applyOption = (
  option: OptionMatch,
  host: string,
  port: number
): { host: string; port: number } => {
  if (option.name === "host") {
    return { host: option.value, port };
  }
  return { host, port: parsePort(option.value, port) };
};

const printUsage = (): void => {
  process.stdout.write(
    [
      "CodeAI Hub Core Supervisor",
      "",
      "Usage:",
      "  codeai-core start [--host 127.0.0.1] [--port 8080]",
      "  codeai-core stop [--host 127.0.0.1] [--port 8080]",
      "  codeai-core status [--host 127.0.0.1] [--port 8080]",
      "",
    ].join("\n")
  );
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
    GEMINI_WORKSPACE_PATH: defaultWorkspace,
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
    env.GEMINI_MODULE_PATH = path.join(providersRoot, "gemini", version);
  }

  return env;
};

interface CoreRuntimeInfo {
  readonly appDir: string;
  readonly entryPoint: string;
  readonly nodePath: string;
  readonly platformKey: string;
  readonly runtimeDir: string;
  readonly version: string;
}

const detectPlatformKey = (): string | null => {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "darwin" && arch === "arm64") {
    return "darwin-arm64";
  }
  if (platform === "darwin" && arch === "x64") {
    return "darwin-x64";
  }
  if (platform === "linux" && arch === "x64") {
    return "linux-x64";
  }
  if (platform === "win32" && arch === "x64") {
    return "win32-x64";
  }
  return null;
};

const isSemverDirectory = (name: string): boolean =>
  SEMVER_DIRECTORY_PATTERN.test(name);

const compareSemver = (a: string, b: string): number => {
  const pa = a.split(".").map((value) => Number.parseInt(value, 10));
  const pb = b.split(".").map((value) => Number.parseInt(value, 10));
  for (let index = 0; index < SEMVER_PART_COUNT; index += 1) {
    const av = pa[index] ?? 0;
    const bv = pb[index] ?? 0;
    if (av !== bv) {
      return av - bv;
    }
  }
  return 0;
};

const tryResolveCoreRuntime = (): CoreRuntimeInfo | null => {
  const platformKey = detectPlatformKey();
  if (!platformKey) {
    return null;
  }

  const platformRoot = path.join(CORE_RUNTIME_ROOT, platformKey);
  let entries: string[];
  try {
    entries = readdirSync(platformRoot, {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(isSemverDirectory)
      .sort(compareSemver);
  } catch {
    return null;
  }

  if (entries.length === 0) {
    return null;
  }

  const version = entries.at(-1) as string;
  const runtimeDir = path.join(platformRoot, version);
  const appDir = path.join(runtimeDir, "app");
  const entryPoint = path.join(appDir, "dist", "index.js");

  const nodeBinary =
    platformKey === "win32-x64"
      ? path.join(runtimeDir, "node", "node.exe")
      : path.join(runtimeDir, "node", "bin", "node");

  if (!(existsSync(nodeBinary) && existsSync(entryPoint))) {
    return null;
  }

  return {
    platformKey,
    version,
    runtimeDir,
    nodePath: nodeBinary,
    appDir,
    entryPoint,
  };
};

const resolveCoreEntryPoint = (): string => {
  try {
    const packagePath = supervisorRequire.resolve(
      "@codeai-hub/core/package.json"
    );
    return path.join(path.dirname(packagePath), "dist/index.js");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to resolve @codeai-hub/core entry point (${reason}). Run "npm run build --workspace @codeai-hub/core" and try again.`
    );
  }
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
): Promise<HealthResponse | null> => {
  try {
    const response = await fetchWithTimeout(
      `http://${options.host}:${options.port}${HEALTH_PATH}`
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as HealthResponse;
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
