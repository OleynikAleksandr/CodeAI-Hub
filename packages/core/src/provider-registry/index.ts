import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  ClaudeInstallerPaths,
  ClaudeModuleOptions,
  ModuleReporter,
} from "@codeai-hub/claude-module";
import type {
  CodexInstallerPaths,
  CodexModuleOptions,
} from "@codeai-hub/codex-module";
import type { CoreConfig } from "../config";
import type {
  RuntimeStatusEvent,
  RuntimeStatusPhase,
  RuntimeStatusReporter,
} from "../status/runtime-status-reporter";
import type { Logger } from "../telemetry/logger";

type GeminiInstallerPaths = {
  readonly macOS: string;
  readonly linux: string;
  readonly windows: string;
};

type GeminiModuleOptions = {
  readonly installerPaths: GeminiInstallerPaths;
  readonly workspace: {
    readonly workspacePath: string;
    readonly defaultModel?: string;
    readonly settingsPath?: string;
  };
  readonly reporter?: ModuleReporter;
  readonly enableDebugLogging?: boolean;
  readonly credentials?: {
    readonly directory?: string;
    readonly requiredFiles?: readonly string[];
  };
};

export type Provider = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: "active" | "inactive";
};

type ProviderAdapter = {
  initialize(): Promise<void>;
  createSession(): Promise<string>;
  closeSession(sessionId: string): Promise<void>;
  sendMessage(sessionId: string, content: string): Promise<void>;
  subscribe(
    sessionId: string,
    listener: (payload: unknown) => void
  ): () => void;
};

export type ProviderDescriptor = Provider & {
  readonly adapter?: ProviderAdapter;
};

type MutableProviderDescriptor = {
  -readonly [Key in keyof ProviderDescriptor]: ProviderDescriptor[Key];
};

const CLAUDE_INSTALLER_PATHS: ClaudeInstallerPaths = {
  macOS:
    "/Users/oleksandroliinyk/.npm-global/lib/node_modules/@anthropic-ai/claude-agent-sdk/",
  linux: "~/.npm-global/lib/node_modules/@anthropic-ai/claude-agent-sdk/",
  windows:
    "%USERPROFILE%\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-agent-sdk\\",
};

const CODEX_INSTALLER_PATHS: CodexInstallerPaths = {
  macOS:
    "/Users/oleksandroliinyk/.npm-global/lib/node_modules/@openai/codex-sdk/",
  linux: "~/.npm-global/lib/node_modules/@openai/codex-sdk/",
  windows:
    "%USERPROFILE%\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex-sdk\\",
};

const GEMINI_INSTALLER_PATHS: GeminiInstallerPaths = {
  macOS:
    "/Users/oleksandroliinyk/.npm-global/lib/node_modules/@google/gemini-cli/",
  linux: "~/.npm-global/lib/node_modules/@google/gemini-cli/",
  windows:
    "%USERPROFILE%\\AppData\\Roaming\\npm\\node_modules\\@google\\gemini-cli\\",
};

type ClaudeAdapterCtor = new (options: ClaudeModuleOptions) => ProviderAdapter;

type CodexAdapterCtor = new (options: CodexModuleOptions) => ProviderAdapter;

type GeminiAdapterCtor = new (options: GeminiModuleOptions) => ProviderAdapter;

const requireModule = createRequire(__filename);
const dynamicRequire = (specifier: string): unknown => requireModule(specifier);

const dynamicImportModule = <T>(specifier: string): Promise<T> =>
  Function("specifier", "return import(specifier);")(specifier) as Promise<T>;

const extractGeminiAdapterCtor = (
  candidate: unknown
): GeminiAdapterCtor | null => {
  if (typeof candidate === "function") {
    return candidate as GeminiAdapterCtor;
  }
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  const direct = (candidate as { GeminiProviderAdapter?: unknown })
    .GeminiProviderAdapter;
  if (typeof direct === "function") {
    return direct as GeminiAdapterCtor;
  }
  const fallback = (candidate as { default?: unknown }).default;
  if (fallback && typeof fallback === "object") {
    const nested = (fallback as { GeminiProviderAdapter?: unknown })
      .GeminiProviderAdapter;
    if (typeof nested === "function") {
      return nested as GeminiAdapterCtor;
    }
  }
  return null;
};

type GeminiAdapterResolution =
  | { readonly kind: "ctor"; readonly ctor: GeminiAdapterCtor }
  | { readonly kind: "loader"; readonly loader: () => Promise<unknown> };

const resolveGeminiAdapter = (
  loaded: unknown
): GeminiAdapterResolution | null => {
  const direct = extractGeminiAdapterCtor(loaded);
  if (direct) {
    return { kind: "ctor", ctor: direct };
  }

  if (!loaded || typeof loaded !== "object") {
    return null;
  }

  const loader = (loaded as { loadGeminiProviderAdapter?: unknown })
    .loadGeminiProviderAdapter;
  if (typeof loader === "function") {
    return {
      kind: "loader",
      loader: loader as () => Promise<unknown>,
    };
  }

  const fallback = (loaded as { default?: unknown }).default;
  if (fallback && typeof fallback === "object") {
    const nestedLoader = (fallback as { loadGeminiProviderAdapter?: unknown })
      .loadGeminiProviderAdapter;
    if (typeof nestedLoader === "function") {
      return {
        kind: "loader",
        loader: nestedLoader as () => Promise<unknown>,
      };
    }
  }

  return null;
};

const materializeAdapterResolution = async (
  resolution: GeminiAdapterResolution | null,
  logger: Logger
): Promise<GeminiAdapterCtor | null> => {
  if (!resolution) {
    return null;
  }
  if (resolution.kind === "ctor") {
    return resolution.ctor;
  }
  try {
    const loaded = await resolution.loader();
    const ctor = extractGeminiAdapterCtor(loaded);
    if (!ctor) {
      logger.warn("Gemini adapter loader returned unexpected payload");
    }
    return ctor;
  } catch (error) {
    logger.warn("Gemini adapter loader invocation failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const loadClaudeAdapterCtor = (
  overridePath: string | undefined,
  logger: Logger
): ClaudeAdapterCtor => {
  if (overridePath) {
    try {
      const overrideEntry = path.join(overridePath, "dist", "index.js");
      const loaded = dynamicRequire(overrideEntry) as {
        readonly ClaudeProviderAdapter?: ClaudeAdapterCtor;
      };
      if (loaded?.ClaudeProviderAdapter) {
        logger.info("Loaded Claude module from override path", {
          overridePath,
        });
        return loaded.ClaudeProviderAdapter;
      }
      logger.warn("Override path missing ClaudeProviderAdapter export", {
        overridePath,
      });
    } catch (error) {
      logger.error("Failed to load Claude module override", error as Error, {
        overridePath,
      });
    }
  }
  const bundled = dynamicRequire("@codeai-hub/claude-module") as {
    readonly ClaudeProviderAdapter: ClaudeAdapterCtor;
  };
  return bundled.ClaudeProviderAdapter;
};

const loadCodexAdapterCtor = (
  overridePath: string | undefined,
  logger: Logger
): CodexAdapterCtor => {
  if (overridePath) {
    try {
      const overrideEntry = path.join(overridePath, "dist", "index.js");
      const loaded = dynamicRequire(overrideEntry) as {
        readonly CodexProviderAdapter?: CodexAdapterCtor;
      };
      if (loaded?.CodexProviderAdapter) {
        logger.info("Loaded Codex module from override path", {
          overridePath,
        });
        return loaded.CodexProviderAdapter;
      }
      logger.warn("Override path missing CodexProviderAdapter export", {
        overridePath,
      });
    } catch (error) {
      logger.error("Failed to load Codex module override", error as Error, {
        overridePath,
      });
    }
  }
  const bundled = dynamicRequire("@codeai-hub/codex-module") as {
    readonly CodexProviderAdapter: CodexAdapterCtor;
  };
  return bundled.CodexProviderAdapter;
};

const loadGeminiAdapterCtor = async (
  overridePath: string | undefined,
  logger: Logger
): Promise<GeminiAdapterCtor> => {
  const importAndResolve = async (
    specifier: string
  ): Promise<GeminiAdapterCtor | null> => {
    try {
      const loaded = await dynamicImportModule<unknown>(specifier);
      const resolution = resolveGeminiAdapter(loaded);
      return await materializeAdapterResolution(resolution, logger);
    } catch (importError) {
      logger.warn("Dynamic import failed", {
        specifier,
        message:
          importError instanceof Error
            ? importError.message
            : String(importError),
      });
      return null;
    }
  };

  const requireAndResolve = async (
    specifier: string
  ): Promise<GeminiAdapterCtor | null> => {
    try {
      const loaded = dynamicRequire(specifier);
      const resolution = resolveGeminiAdapter(loaded);
      return await materializeAdapterResolution(resolution, logger);
    } catch (requireError) {
      logger.debug("Require fallback failed", {
        specifier,
        message:
          requireError instanceof Error
            ? requireError.message
            : String(requireError),
      });
      return null;
    }
  };

  const tryResolve = async (
    specifier: string,
    allowRequireFallback = false
  ): Promise<GeminiAdapterCtor | null> => {
    const imported = await importAndResolve(specifier);
    if (imported) {
      return imported;
    }
    if (!allowRequireFallback) {
      return null;
    }
    return await requireAndResolve(specifier);
  };

  if (overridePath) {
    const overrideEsmEntry = path.join(overridePath, "dist", "index.js");
    const overrideEsmUrl = pathToFileURL(overrideEsmEntry).href;
    const overrideCjsEntry = path.join(overridePath, "dist", "index.cjs");
    const adapter =
      (await tryResolve(overrideCjsEntry, true)) ??
      (await tryResolve(overrideEsmUrl)) ??
      (await tryResolve(overrideEsmEntry, true));
    if (adapter) {
      logger.info("Loaded Gemini module from override path", {
        overridePath,
      });
      return adapter;
    }

    logger.warn("Override path missing GeminiProviderAdapter export", {
      overridePath,
    });
  }

  const bundledAdapter = await tryResolve("@codeai-hub/gemini-module", true);

  if (!bundledAdapter) {
    throw new Error("GeminiProviderAdapter export not found in bundled module");
  }

  return bundledAdapter;
};

export class ProviderRegistry {
  private readonly providers: ProviderDescriptor[];
  private readonly claudeAdapterCtor: ClaudeAdapterCtor;
  private readonly codexAdapterCtor: CodexAdapterCtor;
  private readonly geminiAdapterCtorPromise: Promise<GeminiAdapterCtor>;
  private readonly geminiWorkspacePath: string;
  private readonly geminiDefaultModel?: string;
  private readonly geminiCredentialsDirectory?: string;
  private readonly options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
    readonly statusReporter: RuntimeStatusReporter;
  };

  private readonly statusReporter: RuntimeStatusReporter;

  constructor(options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
    readonly statusReporter: RuntimeStatusReporter;
  }) {
    this.options = options;
    this.statusReporter = options.statusReporter;
    this.claudeAdapterCtor = loadClaudeAdapterCtor(
      process.env.CLAUDE_MODULE_PATH,
      this.options.logger
    );
    this.codexAdapterCtor = loadCodexAdapterCtor(
      process.env.CODEX_MODULE_PATH,
      this.options.logger
    );
    this.geminiAdapterCtorPromise = loadGeminiAdapterCtor(
      process.env.GEMINI_MODULE_PATH,
      this.options.logger
    );
    this.geminiWorkspacePath = this.options.config.geminiWorkspacePath;
    this.geminiDefaultModel = this.options.config.geminiDefaultModel;
    this.geminiCredentialsDirectory =
      this.options.config.geminiCredentialsDirectory;
    this.providers = this.initializeProviders();
  }

  async initialize(): Promise<void> {
    this.emitStatus({
      phase: "provider",
      scope: "providers",
      label: "Connecting provider modules...",
    });
    await this.ensureGeminiAdapter();
    await Promise.all(
      this.providers.map(async (provider) => {
        if (!provider.adapter) {
          return;
        }
        this.emitStatus({
          phase: "provider",
          scope: provider.id,
          label: `Preparing ${provider.name} module...`,
        });
        try {
          await provider.adapter.initialize();
          this.emitStatus({
            phase: "provider",
            scope: provider.id,
            label: `${provider.name} is ready.`,
          });
        } catch (error) {
          this.options.logger.error(
            "Provider initialization failed",
            error instanceof Error ? error : new Error(String(error)),
            { providerId: provider.id }
          );
          this.emitStatus({
            phase: "provider",
            scope: provider.id,
            label: `Failed to initialize ${provider.name}.`,
          });
          const mutable = provider as MutableProviderDescriptor;
          mutable.status = "inactive";
          mutable.adapter = undefined;
        }
      })
    );
  }

  listProviders(): Provider[] {
    return this.providers.map(({ adapter, ...rest }) => rest);
  }

  getAdapter(providerId: string): ProviderAdapter | undefined {
    return this.providers.find((provider) => provider.id === providerId)
      ?.adapter;
  }

  private initializeProviders(): ProviderDescriptor[] {
    const claudeAdapter = new this.claudeAdapterCtor({
      installerPaths: CLAUDE_INSTALLER_PATHS,
      workspace: {
        workspacePath: this.options.config.claudeWorkspacePath,
        claudeProjectSlug: this.options.config.claudeProjectSlug,
        settingsPath: this.options.config.claudeSettingsPath,
      },
      reporter: this.createReporter("claude"),
    });

    const {
      codexWorkspacePath,
      codexSandboxMode,
      codexApprovalMode,
      codexDefaultModel,
      codexSkipGitRepoCheck,
    } = this.options.config;

    const codexAdapter = new this.codexAdapterCtor({
      installerPaths: CODEX_INSTALLER_PATHS,
      workspace: {
        workspacePath: codexWorkspacePath,
        defaultSandboxMode: codexSandboxMode,
        defaultApprovalMode: codexApprovalMode,
        defaultModel: codexDefaultModel,
        skipGitRepoCheck: codexSkipGitRepoCheck,
      },
      reporter: this.createReporter("codex"),
    });

    return [
      {
        id: "claudeCodeCli",
        name: "Claude",
        description: "Using your authentication Claude Code CLI",
        status: "active",
        adapter: claudeAdapter,
      },
      {
        id: "codexCli",
        name: "Codex",
        description: "Using your authentication Codex CLI",
        status: "active",
        adapter: codexAdapter,
      },
      {
        id: "geminiCli",
        name: "Gemini",
        description: "Using your authentication Gemini CLI",
        status: "active",
      },
    ];
  }

  private async ensureGeminiAdapter(): Promise<void> {
    const descriptor = this.providers.find(
      (provider) => provider.id === "geminiCli"
    );
    if (!descriptor) {
      return;
    }
    if (descriptor.adapter) {
      return;
    }

    const mutable = descriptor as MutableProviderDescriptor;
    this.emitStatus({
      phase: "provider",
      scope: "geminiCli",
      label: "Loading Gemini module...",
    });
    try {
      const GeminiAdapter = await this.geminiAdapterCtorPromise;
      const credentials = this.geminiCredentialsDirectory
        ? {
            directory: this.geminiCredentialsDirectory,
            requiredFiles: ["oauth_creds.json", "credentials.json"],
          }
        : {
            requiredFiles: ["oauth_creds.json", "credentials.json"],
          };
      const adapter = new GeminiAdapter({
        installerPaths: GEMINI_INSTALLER_PATHS,
        workspace: {
          workspacePath: this.geminiWorkspacePath,
          defaultModel: this.geminiDefaultModel,
        },
        reporter: this.createReporter("gemini"),
        credentials,
      });
      mutable.adapter = adapter;
      this.emitStatus({
        phase: "provider",
        scope: "geminiCli",
        label: "Gemini module loaded.",
      });
    } catch (error) {
      this.options.logger.error(
        "Failed to load Gemini provider module",
        error instanceof Error ? error : new Error(String(error))
      );
      this.emitStatus({
        phase: "provider",
        scope: "geminiCli",
        label: "Gemini module failed to load.",
      });
      mutable.status = "inactive";
    }
  }

  private emitStatus(
    event: Omit<RuntimeStatusEvent, "timestamp" | "phase"> & {
      readonly phase: RuntimeStatusPhase;
    }
  ): void {
    this.statusReporter.emit(event);
  }

  private createReporter(scope: string): ModuleReporter {
    return {
      info: (message) => this.options.logger.info(`[${scope}] ${message}`),
      warn: (message) => this.options.logger.warn(`[${scope}] ${message}`),
      error: (message, error) =>
        this.options.logger.error(
          `[${scope}] ${message}`,
          error instanceof Error ? error : new Error(String(error))
        ),
      progress: (event) => {
        this.statusReporter.emit({
          phase: event.phase ?? "provider",
          scope: event.scope ?? scope,
          label: event.label,
          detail: event.detail,
          firstRun: event.firstRun,
        });
      },
    };
  }
}
