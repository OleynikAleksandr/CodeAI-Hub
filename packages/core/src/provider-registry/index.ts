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

const resolveGeminiAdapter = (
  loaded: unknown
): GeminiAdapterCtor | undefined => {
  if (!loaded || typeof loaded !== "object") {
    return;
  }
  const direct = (loaded as { GeminiProviderAdapter?: unknown })
    .GeminiProviderAdapter;
  if (typeof direct === "function") {
    return direct as GeminiAdapterCtor;
  }
  const fallback = (loaded as { default?: unknown }).default;
  if (fallback && typeof fallback === "object") {
    const nested = (fallback as { GeminiProviderAdapter?: unknown })
      .GeminiProviderAdapter;
    if (typeof nested === "function") {
      return nested as GeminiAdapterCtor;
    }
  }
  return;
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
      return resolveGeminiAdapter(loaded) ?? null;
    } catch (importError) {
      logger.debug("Dynamic import failed", {
        specifier,
        message:
          importError instanceof Error
            ? importError.message
            : String(importError),
      });
      return null;
    }
  };

  const requireAndResolve = (specifier: string): GeminiAdapterCtor | null => {
    try {
      const loaded = dynamicRequire(specifier);
      return resolveGeminiAdapter(loaded) ?? null;
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
    return requireAndResolve(specifier);
  };

  if (overridePath) {
    const overrideEntry = path.join(overridePath, "dist", "index.js");
    const overrideUrl = pathToFileURL(overrideEntry).href;
    const adapter =
      (await tryResolve(overrideUrl, true)) ??
      (await tryResolve(overrideEntry, true));
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
  };

  constructor(options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
  }) {
    this.options = options;
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
    await this.ensureGeminiAdapter();
    await Promise.all(
      this.providers.map(async (provider) => {
        if (!provider.adapter) {
          return;
        }
        try {
          await provider.adapter.initialize();
        } catch (error) {
          this.options.logger.error(
            "Provider initialization failed",
            error instanceof Error ? error : new Error(String(error)),
            { providerId: provider.id }
          );
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
        name: "Claude Agent SDK",
        description: "Anthropic Claude via Agent SDK",
        status: "active",
        adapter: claudeAdapter,
      },
      {
        id: "codexCli",
        name: "Codex SDK",
        description: "OpenAI Codex via local CLI",
        status: "active",
        adapter: codexAdapter,
      },
      {
        id: "geminiCli",
        name: "Gemini CLI",
        description: "Google Gemini via official CLI",
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
    } catch (error) {
      this.options.logger.error(
        "Failed to load Gemini provider module",
        error instanceof Error ? error : new Error(String(error))
      );
      mutable.status = "inactive";
    }
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
    };
  }
}
