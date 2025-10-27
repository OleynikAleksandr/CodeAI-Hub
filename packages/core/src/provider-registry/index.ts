import { createRequire } from "node:module";
import path from "node:path";
import type {
  ClaudeInstallerPaths,
  ClaudeModuleOptions,
  ClaudeProviderAdapter as ClaudeProviderAdapterType,
  ModuleReporter,
} from "@codeai-hub/claude-module";
import type {
  CodexInstallerPaths,
  CodexModuleOptions,
  CodexProviderAdapter as CodexProviderAdapterType,
} from "@codeai-hub/codex-module";
import type { CoreConfig } from "../config";
import type { Logger } from "../telemetry/logger";

export type Provider = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: "active" | "inactive";
};

type ProviderAdapter = ClaudeProviderAdapterType | CodexProviderAdapterType;

export type ProviderDescriptor = Provider & {
  readonly adapter?: ProviderAdapter;
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

type ClaudeAdapterCtor = new (
  options: ClaudeModuleOptions
) => ClaudeProviderAdapterType;

type CodexAdapterCtor = new (
  options: CodexModuleOptions
) => CodexProviderAdapterType;

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

export class ProviderRegistry {
  private readonly providers: ProviderDescriptor[];
  private readonly claudeAdapterCtor: ClaudeAdapterCtor;
  private readonly codexAdapterCtor: CodexAdapterCtor;
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
    this.providers = this.initializeProviders();
  }

  async initialize(): Promise<void> {
    await Promise.all(
      this.providers.map(async (provider) => provider.adapter?.initialize())
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
