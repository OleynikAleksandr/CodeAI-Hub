import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { access, copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import readline from "node:readline";
import type { ModuleReporter } from "../../types";
import { materializeCodexProviderHomeSummaryConfig } from "./codex-provider-home-config";

interface JsonRpcError {
  readonly code?: number;
  readonly message?: string;
}

interface JsonRpcNotification {
  readonly method?: string;
  readonly params?: unknown;
}

interface JsonRpcResponse {
  readonly error?: JsonRpcError;
  readonly id?: string;
  readonly result?: unknown;
}

interface JsonRpcLogRecord {
  readonly fields?: {
    readonly message?: unknown;
  };
  readonly level?: unknown;
  readonly target?: unknown;
}

type JsonRpcLine = JsonRpcNotification | JsonRpcResponse | JsonRpcLogRecord;

const CODEX_EXECUTABLE = process.platform === "win32" ? "codex.cmd" : "codex";
export const CODEAI_CODEX_APP_SERVER_ARGS = [
  "app-server",
  "--disable",
  "multi_agent",
  "--disable",
  "browser_use",
  "--disable",
  "in_app_browser",
  "--disable",
  "computer_use",
  "--disable",
  "image_generation",
  "--disable",
  "plugins",
  "--disable",
  "apps",
  "--disable",
  "tool_search",
  "-c",
  "mcp_servers.codex.enabled=false",
  "-c",
  "mcp_servers.playwright.enabled=false",
] as const;
// Common user-level install locations for the `codex` CLI. Core inherits PATH
// from its parent (VS Code extension host) which on macOS GUI apps often ships
// without the user's npm-global / Homebrew directories even when the shell
// terminal PATH has them. If `spawn("codex")` falls through to ENOENT on the
// recovery path, the provider gets stuck in "unavailable" until the user
// manually restarts VS Code with a fixed PATH. Augmenting the spawn env with
// these candidates keeps PATH lookup as the primary mechanism (no hardcoded
// absolute path in the runtime) while removing the most common failure mode.
const CODEX_PATH_CANDIDATES: readonly string[] =
  process.platform === "win32"
    ? [path.join(homedir(), "AppData", "Roaming", "npm")]
    : [
        path.join(homedir(), ".npm-global", "bin"),
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
      ];

const buildAugmentedPath = (basePath = process.env.PATH ?? ""): string => {
  const inherited = basePath;
  const inheritedEntries = new Set(
    inherited.split(path.delimiter).filter((entry) => entry.length > 0)
  );
  const appended = CODEX_PATH_CANDIDATES.filter(
    (candidate) => !inheritedEntries.has(candidate)
  );
  return [inherited, ...appended].filter(Boolean).join(path.delimiter);
};

const DEFAULT_PROVIDER_CODEX_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "codex",
  "home"
);
const LEGACY_CODEX_HOME = path.join(homedir(), ".codex");
const AUTH_FILENAME = "auth.json";
const CONFIG_FILENAME = "config.toml";
const START_TIMEOUT_MS = 10_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const resolveProviderCodexHome = (): string => {
  const fromEnvironment = process.env.CODEX_HOME?.trim();
  return fromEnvironment?.length
    ? fromEnvironment
    : DEFAULT_PROVIDER_CODEX_HOME;
};

const copyLegacyFileIfMissing = async (
  filename: string,
  providerCodexHome: string
): Promise<void> => {
  const sourcePath = path.join(LEGACY_CODEX_HOME, filename);
  const destinationPath = path.join(providerCodexHome, filename);

  try {
    await access(sourcePath);
  } catch {
    return;
  }

  try {
    await access(destinationPath);
    return;
  } catch {
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
  }
};

const prepareProviderCodexHome = async (): Promise<string> => {
  const providerCodexHome = resolveProviderCodexHome();
  await mkdir(providerCodexHome, { recursive: true });
  await copyLegacyFileIfMissing(AUTH_FILENAME, providerCodexHome);
  await copyLegacyFileIfMissing(CONFIG_FILENAME, providerCodexHome);
  await materializeCodexProviderHomeSummaryConfig(providerCodexHome);
  return providerCodexHome;
};

const extractResponseError = (response: JsonRpcResponse): Error | null => {
  const error = response.error;
  if (!error) {
    return null;
  }
  return new Error(
    error.message ?? `App-server request failed (${error.code})`
  );
};

interface CodexAppServerProcessOptions {
  readonly environment?: Readonly<Record<string, string>>;
  readonly reporter?: ModuleReporter;
}

const isProcessOptions = (
  value: ModuleReporter | CodexAppServerProcessOptions | undefined
): value is CodexAppServerProcessOptions =>
  Boolean(value && ("environment" in value || "reporter" in value));

export class CodexAppServerProcess {
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly environment: Readonly<Record<string, string>>;
  private stdoutReader: readline.Interface | null = null;
  private readonly notificationListeners = new Set<
    (notification: {
      readonly method: string;
      readonly params: unknown;
    }) => void
  >();
  private readonly pendingRequests = new Map<
    string,
    {
      readonly reject: (error: Error) => void;
      readonly resolve: (result: unknown) => void;
    }
  >();
  private requestCounter = 0;
  private startPromise: Promise<void> | null = null;
  private readonly reporter?: ModuleReporter;

  constructor(options?: ModuleReporter | CodexAppServerProcessOptions) {
    this.reporter = isProcessOptions(options) ? options.reporter : options;
    this.environment = isProcessOptions(options)
      ? (options.environment ?? {})
      : {};
  }

  async start(): Promise<void> {
    if (this.child) {
      return;
    }
    if (this.startPromise) {
      await this.startPromise;
      return;
    }
    this.startPromise = this.startInternal().finally(() => {
      this.startPromise = null;
    });
    await this.startPromise;
  }

  onNotification(
    listener: (notification: {
      readonly method: string;
      readonly params: unknown;
    }) => void
  ): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  async request<TResult = unknown>(
    method: string,
    params?: unknown
  ): Promise<TResult> {
    await this.start();
    return (await this.sendRequest(method, params)) as TResult;
  }

  async stop(): Promise<void> {
    const child = this.child;
    if (!child) {
      return;
    }
    this.child = null;
    this.stdoutReader?.close();
    this.stdoutReader = null;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 1000);
      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
      child.kill("SIGTERM");
    });
  }

  private async startInternal(): Promise<void> {
    const providerCodexHome = await prepareProviderCodexHome();
    const child = spawn(CODEX_EXECUTABLE, [...CODEAI_CODEX_APP_SERVER_ARGS], {
      env: {
        ...process.env,
        ...this.environment,
        CODEX_HOME: providerCodexHome,
        PATH: buildAugmentedPath(this.environment.PATH),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child = child;
    this.attachProcessHandlers(child);
    await this.initializeHandshake();
  }

  private attachProcessHandlers(child: ChildProcessWithoutNullStreams): void {
    const stdout = readline.createInterface({ input: child.stdout });
    this.stdoutReader = stdout;
    stdout.on("line", (line) => {
      this.handleStdoutLine(line);
    });

    child.stderr.on("data", (chunk) => {
      const message = chunk.toString().trim();
      if (!message) {
        return;
      }
      this.reporter?.warn?.(`codex app-server stderr: ${message}`);
    });

    child.on("error", (error) => {
      this.reporter?.error?.(
        `codex app-server spawn error: ${toError(error).message}`
      );
    });

    child.on("exit", (code, signal) => {
      if (this.child === child) {
        this.child = null;
      }
      if (this.stdoutReader === stdout) {
        this.stdoutReader.close();
        this.stdoutReader = null;
      }
      const reason =
        code === null
          ? `codex app-server exited with signal ${signal ?? "unknown"}`
          : `codex app-server exited with code ${code}`;
      const error = new Error(reason);
      for (const pending of this.pendingRequests.values()) {
        pending.reject(error);
      }
      this.pendingRequests.clear();
    });
  }

  private async initializeHandshake(): Promise<void> {
    const timeout = setTimeout(() => {
      if (this.child) {
        this.child.kill("SIGTERM");
      }
    }, START_TIMEOUT_MS);
    try {
      await this.sendRequest("initialize", {
        clientInfo: {
          name: "CodeAI Hub",
          version: "1.2.21",
        },
        capabilities: {
          experimentalApi: true,
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async sendRequest(
    method: string,
    params?: unknown
  ): Promise<unknown> {
    const child = this.child;
    if (!child) {
      throw new Error("codex app-server is not running");
    }

    const requestId = `codeai-${++this.requestCounter}`;
    const payload =
      params === undefined
        ? { id: requestId, method }
        : { id: requestId, method, params };

    return await new Promise<unknown>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      child.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (!error) {
          return;
        }
        this.pendingRequests.delete(requestId);
        reject(toError(error));
      });
    });
  }

  private handleStdoutLine(line: string): void {
    if (!line.trim()) {
      return;
    }

    let parsed: JsonRpcLine;
    try {
      parsed = JSON.parse(line) as JsonRpcLine;
    } catch {
      this.reporter?.warn?.(`Ignoring non-JSON app-server line: ${line}`);
      return;
    }

    if (!isRecord(parsed)) {
      return;
    }

    const responseId = asString(parsed.id);
    if (responseId) {
      const pending = this.pendingRequests.get(responseId);
      if (!pending) {
        return;
      }
      this.pendingRequests.delete(responseId);
      const error = extractResponseError(parsed as JsonRpcResponse);
      if (error) {
        pending.reject(error);
        return;
      }
      pending.resolve(parsed.result);
      return;
    }

    const notificationMethod = asString(parsed.method);
    if (notificationMethod) {
      const params = "params" in parsed ? parsed.params : undefined;
      for (const listener of this.notificationListeners) {
        listener({ method: notificationMethod, params });
      }
      return;
    }

    this.handleProtocolLogRecord(parsed);
  }

  private handleProtocolLogRecord(record: Record<string, unknown>): void {
    const level =
      typeof record.level === "string" ? record.level.toLowerCase() : null;
    const message = isRecord(record.fields) ? record.fields.message : undefined;
    const target = typeof record.target === "string" ? record.target : "codex";
    const rendered =
      typeof message === "string" && message.trim().length > 0
        ? `[${target}] ${message}`
        : JSON.stringify(record);
    if (level === "warn") {
      this.reporter?.warn?.(rendered);
      return;
    }
    if (level === "error") {
      this.reporter?.error?.(rendered);
      return;
    }
    this.reporter?.info?.(rendered);
  }
}

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
