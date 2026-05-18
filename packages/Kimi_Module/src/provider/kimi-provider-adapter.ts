import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

interface KimiCliEnvironment {
  readonly args: readonly string[];
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

const buildKimiCliEnvironment = (
  options: KimiCliEnvironmentOptions = {}
): KimiCliEnvironment => {
  const runtimeHome = resolveKimiRuntimeHome(options);
  return {
    args: ["--config-file", runtimeHome.userConfigPath],
    env: {
      ...(options.env ?? process.env),
      KIMI_CLI_NO_AUTO_UPDATE: "1",
      KIMI_SHARE_DIR: runtimeHome.providerHomePath,
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

  async closeSession(sessionId: string): Promise<void> {
    this.listeners.delete(sessionId);
    await this.requireSessionLifecycle().close(sessionId);
  }

  private createWireProcessBridge(): KimiWireProcessBridge {
    const cliEnvironment = this.requireCliEnvironment();
    return new KimiWireProcessBridge({
      args: cliEnvironment.args,
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
        this.options.reporter?.info?.("Kimi Wire event received", {
          params,
        });
        for (const sessionId of this.listeners.keys()) {
          this.dispatchMessage(sessionId, {
            payload: params,
            type: "kimi_wire_event",
          });
        }
      },
      onMalformedFrame: (line, error) => {
        this.options.reporter?.warn?.("Malformed Kimi Wire frame received", {
          errorMessage: error.message,
          line,
        });
      },
      onRequest: (request) => ({
        request_id:
          isRecord(request.params) && isRecord(request.params.payload)
            ? request.params.payload.id
            : request.id,
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
