import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
  private runtimeHome: KimiRuntimeHome | null = null;
  private initialized = false;

  constructor(options: KimiModuleOptions) {
    this.options = options;
  }

  async initialize(): Promise<void> {
    const cliEnvironment = buildKimiCliEnvironment({
      providerHomePath: this.options.workspace.providerHomePath,
      userConfigPath: this.options.workspace.configPath,
    });
    this.runtimeHome = await ensureKimiProviderHome(cliEnvironment.runtimeHome);
    this.initialized = true;
    this.options.reporter?.info?.("Kimi provider scaffold initialized", {
      cliArgs: cliEnvironment.args,
      providerId: KIMI_PROVIDER_ID,
      providerHomePath: this.runtimeHome.providerHomePath,
      userConfigPath: this.runtimeHome.userConfigPath,
    });
  }

  createSession(workspacePath?: string): Promise<string> {
    this.assertInitialized();
    return Promise.resolve(this.createScaffoldSessionId(workspacePath));
  }

  resumeSession(sessionId: string): Promise<string> {
    this.assertInitialized();
    const normalizedSessionId = sessionId.trim();
    if (normalizedSessionId.length === 0) {
      throw new Error("Cannot resume Kimi session with an empty session id.");
    }
    return Promise.resolve(normalizedSessionId);
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
    this.dispatchMessage(sessionId, {
      type: "kimi_scaffold_message_rejected",
      payload: {
        reason: "wire_transport_not_implemented",
      },
    });
    return Promise.resolve();
  }

  cancel(sessionId: string): Promise<void> {
    this.assertInitialized();
    this.dispatchMessage(sessionId, {
      type: "kimi_scaffold_cancelled",
    });
    return Promise.resolve();
  }

  closeSession(sessionId: string): Promise<void> {
    this.listeners.delete(sessionId);
    return Promise.resolve();
  }

  private createScaffoldSessionId(workspacePath?: string): string {
    const resolvedWorkspacePath =
      workspacePath ?? this.options.workspace.workspacePath ?? "workspace";
    return `kimi-scaffold:${Buffer.from(resolvedWorkspacePath).toString(
      "base64url"
    )}`;
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
}
