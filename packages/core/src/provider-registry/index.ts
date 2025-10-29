import { createRequire } from "node:module";
import path from "node:path";
import type {
  ClaudeInstallerPaths,
  ClaudeModuleOptions,
  ModuleReporter,
} from "@codeai-hub/claude-module";
import type {
  CodexInstallerPaths,
  CodexModuleOptions,
} from "@codeai-hub/codex-module";
import type {
  GeminiInstallerPaths,
  GeminiModuleOptions,
} from "@codeai-hub/gemini-module";
import type { CoreConfig } from "../config";
import type { Logger } from "../telemetry/logger";

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

const loadGeminiAdapterCtor = (
  overridePath: string | undefined,
  logger: Logger
): GeminiAdapterCtor => {
  if (overridePath) {
    try {
      const overrideEntry = path.join(overridePath, "dist", "index.js");
      const loaded = dynamicRequire(overrideEntry) as {
        readonly GeminiProviderAdapter?: GeminiAdapterCtor;
      };
      if (loaded?.GeminiProviderAdapter) {
        logger.info("Loaded Gemini module from override path", {
          overridePath,
        });
        return loaded.GeminiProviderAdapter;
      }
      logger.warn("Override path missing GeminiProviderAdapter export", {
        overridePath,
      });
    } catch (error) {
      logger.error("Failed to load Gemini module override", error as Error, {
        overridePath,
      });
    }
  }
  const bundled = dynamicRequire("@codeai-hub/gemini-module") as {
    readonly GeminiProviderAdapter: GeminiAdapterCtor;
  };
  return bundled.GeminiProviderAdapter;
};

export class ProviderRegistry {
  private readonly providers: ProviderDescriptor[];
  private readonly claudeAdapterCtor: ClaudeAdapterCtor;
  private readonly codexAdapterCtor: CodexAdapterCtor;
  private readonly geminiAdapterCtor: GeminiAdapterCtor;
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
    this.geminiAdapterCtor = loadGeminiAdapterCtor(
      process.env.GEMINI_MODULE_PATH,
      this.options.logger
    );
    this.providers = this.initializeProviders();
  }

  async initialize(): Promise<void> {
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
      geminiWorkspacePath,
      geminiDefaultModel,
      geminiCredentialsDirectory,
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

    const geminiCredentials = geminiCredentialsDirectory
      ? {
          directory: geminiCredentialsDirectory,
          requiredFiles: ["oauth_creds.json", "credentials.json"],
        }
      : {
          requiredFiles: ["oauth_creds.json", "credentials.json"],
        };

    const geminiAdapter = new this.geminiAdapterCtor({
      installerPaths: GEMINI_INSTALLER_PATHS,
      workspace: {
        workspacePath: geminiWorkspacePath,
        defaultModel: geminiDefaultModel,
      },
      reporter: this.createReporter("gemini"),
      credentials: geminiCredentials,
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
        adapter: geminiAdapter,
      },
    ];
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
