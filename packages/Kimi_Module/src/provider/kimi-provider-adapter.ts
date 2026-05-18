import { accessSync, constants } from "node:fs";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeKimiWireEvent } from "../messaging/kimi-event-normalizer";
import { normalizeKimiWireRequest } from "../messaging/kimi-request-failure-normalizer";
import { KimiSessionLifecycle } from "../session/kimi-session-lifecycle";
import { KimiWireProcessBridge } from "../wire/kimi-wire-process";
import { KimiWireRouter } from "../wire/kimi-wire-router";

export const KIMI_PROVIDER_ID = "kimiCode" as const;
const KIMI_PROVIDER_HOME_RELATIVE_PATH = path.join(
  ".codeai-hub",
  "providers",
  "kimi",
  "home"
);
const KIMI_DEFAULT_CONFIG_RELATIVE_PATH = path.join(".kimi", "config.toml");
const KIMI_CLI_PATH_ENV = "KIMI_CLI_PATH";
const KIMI_BINARY_NAME = "kimi";
const KIMI_USER_LOCAL_BIN_RELATIVE_PATH = path.join(".local", "bin");
const KIMI_COMMON_BIN_DIRS = ["/opt/homebrew/bin", "/usr/local/bin"] as const;

export type SessionListener = (payload: KimiSessionEvent) => void;

export interface ModuleReporter {
  readonly error?: (
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>
  ) => void;
  readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
}

export interface KimiWorkspaceOptions {
  readonly configPath?: string;
  readonly defaultModel?: string;
  readonly providerHomePath?: string;
  readonly workspacePath?: string;
}

export interface KimiModuleOptions {
  readonly reporter?: ModuleReporter;
  readonly workspace: KimiWorkspaceOptions;
}

interface KimiRuntimeHome {
  readonly providerHomePath: string;
  readonly userConfigPath: string;
}

interface KimiRuntimeHomeOptions {
  readonly homeDir?: string;
  readonly providerHomePath?: string;
  readonly userConfigPath?: string;
}

export interface KimiSessionEvent {
  readonly payload?: unknown;
  readonly type: string;
}

interface KimiNativeRequestCaptureOptions {
  readonly captureId: string;
  readonly recordAppliedInputEnvelope?: (envelope: {
    readonly kind: "kimi";
    readonly providerHomePath: string | null;
    readonly selectedModelId: string | null;
    readonly userConfigPath: string | null;
    readonly wireJsonlPath: string | null;
  }) => Promise<void> | void;
  readonly recordDiagnosticContext?: (record: {
    readonly kind: string;
    readonly payload: unknown;
  }) => Promise<void> | void;
  readonly scenarioId?: string | null;
  readonly selectedModelId?: string | null;
  readonly workflowPrompt?: string | null;
  readonly workspacePath: string;
}

interface KimiCliEnvironment {
  readonly args: readonly string[];
  readonly command: string;
  readonly env: NodeJS.ProcessEnv;
  readonly runtimeHome: KimiRuntimeHome;
}

interface KimiCliEnvironmentOptions extends KimiRuntimeHomeOptions {
  readonly env?: NodeJS.ProcessEnv;
}

const resolveHomeDir = (homeDir?: string): string => {
  const resolvedHomeDir = homeDir ?? os.homedir();
  if (resolvedHomeDir.trim().length === 0) {
    throw new Error(
      "Cannot resolve Kimi runtime home without a home directory."
    );
  }
  return resolvedHomeDir;
};

const resolveKimiRuntimeHome = (
  options: KimiRuntimeHomeOptions = {}
): KimiRuntimeHome => {
  const homeDir = resolveHomeDir(options.homeDir);
  return {
    providerHomePath:
      options.providerHomePath ??
      path.join(homeDir, KIMI_PROVIDER_HOME_RELATIVE_PATH),
    userConfigPath:
      options.userConfigPath ??
      path.join(homeDir, KIMI_DEFAULT_CONFIG_RELATIVE_PATH),
  };
};

const ensureKimiProviderHome = async (
  options: KimiRuntimeHomeOptions = {}
): Promise<KimiRuntimeHome> => {
  const runtimeHome = resolveKimiRuntimeHome(options);
  await mkdir(runtimeHome.providerHomePath, { recursive: true });
  return runtimeHome;
};

const canExecuteFile = (filePath: string): boolean => {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const prependPathEntries = (
  pathValue: string | undefined,
  entries: readonly string[]
): string => {
  const existingEntries =
    pathValue?.split(path.delimiter).filter(Boolean) ?? [];
  const nextEntries = [...entries, ...existingEntries];
  return Array.from(new Set(nextEntries)).join(path.delimiter);
};

const getKimiCandidateBinDirs = (homeDir: string): string[] => [
  path.join(homeDir, KIMI_USER_LOCAL_BIN_RELATIVE_PATH),
  ...KIMI_COMMON_BIN_DIRS,
];

const resolveKimiCliCommand = (
  env: NodeJS.ProcessEnv,
  homeDir: string
): string => {
  const explicitCommand = env[KIMI_CLI_PATH_ENV]?.trim();
  if (explicitCommand) {
    return explicitCommand;
  }

  for (const binDir of getKimiCandidateBinDirs(homeDir)) {
    const candidatePath = path.join(binDir, KIMI_BINARY_NAME);
    if (canExecuteFile(candidatePath)) {
      return candidatePath;
    }
  }

  return KIMI_BINARY_NAME;
};

const buildKimiCliEnvironment = (
  options: KimiCliEnvironmentOptions = {}
): KimiCliEnvironment => {
  const baseEnv = options.env ?? process.env;
  const runtimeHome = resolveKimiRuntimeHome(options);
  const homeDir = resolveHomeDir(options.homeDir);
  const candidateBinDirs = getKimiCandidateBinDirs(homeDir);
  return {
    args: ["--config-file", runtimeHome.userConfigPath],
    command: resolveKimiCliCommand(baseEnv, homeDir),
    env: {
      ...baseEnv,
      KIMI_CLI_NO_AUTO_UPDATE: "1",
      KIMI_SHARE_DIR: runtimeHome.providerHomePath,
      PATH: prependPathEntries(baseEnv.PATH, candidateBinDirs),
    },
    runtimeHome,
  };
};

export class KimiProviderAdapter {
  private readonly listeners = new Map<string, Set<SessionListener>>();
  private readonly options: KimiModuleOptions;
  private cliEnvironment: KimiCliEnvironment | null = null;
  private runtimeHome: KimiRuntimeHome | null = null;
  private sessionLifecycle: KimiSessionLifecycle | null = null;
  private wireProcessBridge: KimiWireProcessBridge | null = null;
  private wireRouter: KimiWireRouter | null = null;
  private initialized = false;

  constructor(options: KimiModuleOptions) {
    this.options = options;
  }

  async initialize(): Promise<void> {
    const cliEnvironment = buildKimiCliEnvironment({
      providerHomePath: this.options.workspace.providerHomePath,
      userConfigPath: this.options.workspace.configPath,
    });
    this.cliEnvironment = cliEnvironment;
    this.runtimeHome = await ensureKimiProviderHome(cliEnvironment.runtimeHome);
    this.wireRouter = this.createWireRouter();
    this.wireProcessBridge = this.createWireProcessBridge();
    this.sessionLifecycle = new KimiSessionLifecycle({
      processBridge: this.wireProcessBridge,
      router: this.wireRouter,
    });
    this.initialized = true;
    this.options.reporter?.info?.("Kimi provider scaffold initialized", {
      cliArgs: cliEnvironment.args,
      cliCommand: cliEnvironment.command,
      providerId: KIMI_PROVIDER_ID,
      providerHomePath: this.runtimeHome.providerHomePath,
      userConfigPath: this.runtimeHome.userConfigPath,
      wireProcessReady: this.wireProcessBridge !== null,
      wireRouterReady: this.wireRouter !== null,
    });
  }

  createSession(workspacePath?: string): Promise<string> {
    this.assertInitialized();
    if (workspacePath) {
      this.options.reporter?.info?.("Kimi session workspace override", {
        workspacePath,
      });
    }
    return this.requireSessionLifecycle().create();
  }

  resumeSession(sessionId: string): Promise<string> {
    this.assertInitialized();
    return this.requireSessionLifecycle().resume(sessionId);
  }

  onSessionEvent(sessionId: string, listener: SessionListener): () => void {
    const listeners = this.listeners.get(sessionId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(sessionId, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(sessionId);
      }
    };
  }

  subscribe(
    sessionId: string,
    listener: (payload: unknown) => void
  ): () => void {
    return this.onSessionEvent(sessionId, (payload) => listener(payload));
  }

  sendMessage(sessionId: string, content: string): Promise<void> {
    this.assertInitialized();
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Cannot send an empty Kimi message.");
    }
    return this.requireSessionLifecycle().send(sessionId, trimmedContent);
  }

  cancel(sessionId: string): Promise<void> {
    this.assertInitialized();
    return this.requireSessionLifecycle().cancel(sessionId);
  }

  async captureNativeRequest(
    options: KimiNativeRequestCaptureOptions
  ): Promise<void> {
    this.assertInitialized();
    const runtimeHome = this.requireRuntimeHome();
    const wireJsonlPath = path.join(runtimeHome.providerHomePath, "wire.jsonl");
    const selectedModelId =
      options.selectedModelId ?? this.options.workspace.defaultModel ?? null;
    await options.recordAppliedInputEnvelope?.({
      kind: "kimi",
      providerHomePath: runtimeHome.providerHomePath,
      selectedModelId,
      userConfigPath: runtimeHome.userConfigPath,
      wireJsonlPath,
    });
    await options.recordDiagnosticContext?.({
      kind: "kimi_wire_capture",
      payload: {
        captureId: options.captureId,
        promptLength: options.workflowPrompt?.length ?? 0,
        scenarioId: options.scenarioId ?? null,
        selectedModelId,
        userConfigPath: runtimeHome.userConfigPath,
        wireJsonlPath,
        workspacePath: options.workspacePath,
      },
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    this.listeners.delete(sessionId);
    await this.requireSessionLifecycle().close(sessionId);
  }

  refreshUsageLimits(params: {
    readonly broadcast: (event: unknown) => void;
    readonly providerSessionId: string;
  }): void {
    params.broadcast({
      providerScopeKey: "kimi:global",
      usageLimits: null,
      data: {
        kind: "usage_limits",
        collectedAt: new Date().toISOString(),
        diagnostics: {
          force: false,
          fromCache: false,
          readerRegistered: false,
          result: "unavailable",
          source: "kimi_unavailable",
        },
        providerScopeKey: "kimi:global",
        source: "kimi_unavailable",
        usageLimitLabels: {
          currentSession: "Session",
          currentWeekAllModels: "Weekly",
          currentWeekSonnetOnly: "Model Weekly",
        },
        usageLimits: null,
      },
      providerSessionId: params.providerSessionId,
    });
  }

  private createWireProcessBridge(): KimiWireProcessBridge {
    const cliEnvironment = this.requireCliEnvironment();
    return new KimiWireProcessBridge({
      args: cliEnvironment.args,
      command: cliEnvironment.command,
      cwd: this.options.workspace.workspacePath ?? process.cwd(),
      env: cliEnvironment.env,
      onLine: (line) => {
        this.requireWireRouter().handleLine(line);
      },
      onStderr: (line) => {
        this.options.reporter?.warn?.("Kimi Wire stderr line received", {
          line,
        });
      },
    });
  }

  private createWireRouter(): KimiWireRouter {
    return new KimiWireRouter({
      onEvent: (params) => {
        const events = normalizeKimiWireEvent(params);
        for (const sessionId of this.listeners.keys()) {
          for (const event of events) {
            this.dispatchMessage(sessionId, event);
          }
        }
      },
      onMalformedFrame: (line, error) => {
        this.options.reporter?.warn?.("Malformed Kimi Wire frame received", {
          errorMessage: error.message,
          line,
        });
      },
      onRequest: (request) => ({
        request_id: this.handleProviderRequest(request),
        response: "deny",
      }),
      sendJson: (message) => this.requireWireProcessBridge().sendJson(message),
    });
  }

  private dispatchMessage(sessionId: string, payload: KimiSessionEvent): void {
    const listeners = this.listeners.get(sessionId);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener(payload);
    }
  }

  private handleProviderRequest(request: {
    readonly id: string | number;
    readonly params?: unknown;
  }): string | number | unknown {
    const event = normalizeKimiWireRequest({
      id: request.id,
      method: "request",
      params: request.params,
    });
    for (const sessionId of this.listeners.keys()) {
      this.dispatchMessage(sessionId, event);
    }
    return isRecord(request.params) && isRecord(request.params.payload)
      ? request.params.payload.id
      : request.id;
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error("Kimi provider adapter must be initialized before use.");
    }
  }

  private requireCliEnvironment(): KimiCliEnvironment {
    if (!this.cliEnvironment) {
      throw new Error("Kimi CLI environment is not initialized.");
    }
    return this.cliEnvironment;
  }

  private requireRuntimeHome(): KimiRuntimeHome {
    if (!this.runtimeHome) {
      throw new Error("Kimi runtime home is not initialized.");
    }
    return this.runtimeHome;
  }

  private requireSessionLifecycle(): KimiSessionLifecycle {
    if (!this.sessionLifecycle) {
      throw new Error("Kimi session lifecycle is not initialized.");
    }
    return this.sessionLifecycle;
  }

  private requireWireProcessBridge(): KimiWireProcessBridge {
    if (!this.wireProcessBridge) {
      throw new Error("Kimi Wire process bridge is not initialized.");
    }
    return this.wireProcessBridge;
  }

  private requireWireRouter(): KimiWireRouter {
    if (!this.wireRouter) {
      throw new Error("Kimi Wire router is not initialized.");
    }
    return this.wireRouter;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
