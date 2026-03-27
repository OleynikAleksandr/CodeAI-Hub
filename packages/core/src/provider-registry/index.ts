import type { ModuleReporter } from "@codeai-hub/claude-module";
import type { CoreConfig } from "../config";
import type {
  RuntimeStatusEvent,
  RuntimeStatusPhase,
  RuntimeStatusReporter,
} from "../status/runtime-status-reporter";
import type { Logger } from "../telemetry/logger";
import {
  createClaudeAdapterInstance,
  createCodexAdapterInstance,
  createGeminiAdapterInstance,
  createProviderDescriptors,
} from "./provider-descriptor-factory";
import {
  resolveClaudeModulePath,
  resolveCodexModulePath,
  resolveGeminiModulePath,
} from "./provider-installed-path-resolver";
import {
  loadClaudeAdapterCtor,
  loadCodexAdapterCtor,
  loadGeminiAdapterCtor,
} from "./provider-module-loader";
import type {
  ClaudeAdapterCtor,
  CodexAdapterCtor,
  GeminiAdapterCtor,
  MutableProviderDescriptor,
  Provider,
  ProviderAdapter,
  ProviderDescriptor,
} from "./provider-module-loader.types";
import { ProviderRecoveryCoordinator } from "./provider-recovery-coordinator";
import { ProviderRecoveryScheduler } from "./provider-recovery-scheduler";

export type {
  Provider,
  ProviderDescriptor,
} from "./provider-module-loader.types";

export class ProviderRegistry {
  private readonly providers: ProviderDescriptor[];
  private readonly claudeAdapterCtor: ClaudeAdapterCtor;
  private readonly codexAdapterCtor: CodexAdapterCtor;
  private readonly geminiAdapterCtorPromise: Promise<GeminiAdapterCtor | null>;
  private readonly geminiWorkspacePath: string;
  private readonly geminiDefaultModel?: string;
  private readonly geminiThinkingLevelByModel: Record<string, string>;
  private readonly geminiSettingsPath: string;
  private readonly geminiCredentialsDirectory?: string;
  private readonly options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
    readonly statusReporter: RuntimeStatusReporter;
  };

  private readonly statusReporter: RuntimeStatusReporter;
  private readonly pendingRetryProviders = new Set<string>();
  private readonly recoveryCoordinator: ProviderRecoveryCoordinator;
  private readonly recoveryScheduler: ProviderRecoveryScheduler;

  constructor(options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
    readonly statusReporter: RuntimeStatusReporter;
  }) {
    this.options = options;
    this.statusReporter = options.statusReporter;
    this.claudeAdapterCtor = loadClaudeAdapterCtor(
      resolveClaudeModulePath(),
      this.options.logger
    );
    this.codexAdapterCtor = loadCodexAdapterCtor(
      resolveCodexModulePath(),
      this.options.logger
    );
    this.geminiAdapterCtorPromise = loadGeminiAdapterCtor(
      resolveGeminiModulePath(),
      this.options.logger
    );
    this.geminiWorkspacePath =
      this.options.config.geminiWorkspacePath ?? process.cwd();
    this.geminiDefaultModel = this.options.config.geminiDefaultModel;
    this.geminiThinkingLevelByModel =
      this.options.config.geminiThinkingLevelByModel;
    this.geminiSettingsPath = this.options.config.geminiSettingsPath;
    this.geminiCredentialsDirectory =
      this.options.config.geminiCredentialsDirectory;
    this.recoveryScheduler = new ProviderRecoveryScheduler({
      logger: this.options.logger,
      retry: async (providerId) => {
        await this.attemptProviderRecovery(providerId);
      },
    });
    this.recoveryCoordinator = new ProviderRecoveryCoordinator({
      clearRetry: (providerId) => this.recoveryScheduler.clearRetry(providerId),
      createClaudeAdapter: () =>
        createClaudeAdapterInstance({
          claudeAdapterCtor: this.claudeAdapterCtor,
          config: this.options.config,
          createReporter: (scope) => this.createReporter(scope),
        }),
      createCodexAdapter: () =>
        createCodexAdapterInstance({
          codexAdapterCtor: this.codexAdapterCtor,
          config: this.options.config,
          createReporter: (scope) => this.createReporter(scope),
        }),
      emitStatus: (event) => this.emitStatus(event),
      ensureGeminiAdapter: async () => {
        await this.ensureGeminiAdapter();
      },
      logger: this.options.logger,
      scheduleRetry: (providerId) =>
        this.recoveryScheduler.scheduleRetry(providerId),
    });
    this.providers = createProviderDescriptors({
      claudeAdapterCtor: this.claudeAdapterCtor,
      codexAdapterCtor: this.codexAdapterCtor,
      config: this.options.config,
      createReporter: (scope) => this.createReporter(scope),
      handleAdapterConstructionFailure: (descriptor, error, failureLabel) =>
        this.recoveryCoordinator.handleAdapterConstructionFailure(
          descriptor,
          error,
          failureLabel,
          this.pendingRetryProviders
        ),
    });
    for (const providerId of this.pendingRetryProviders) {
      this.recoveryScheduler.scheduleRetry(providerId);
    }
    this.pendingRetryProviders.clear();
  }

  async initialize(): Promise<void> {
    this.emitStatus({
      phase: "provider",
      scope: "providers",
      label: "Connecting provider modules...",
    });
    await this.ensureGeminiAdapter();
    await Promise.all(
      this.providers.map((provider) =>
        this.prepareProvider(provider as MutableProviderDescriptor)
      )
    );
  }

  listProviders(): Provider[] {
    return this.providers.map(({ adapter, ...rest }) => rest);
  }

  getAdapter(providerId: string): ProviderAdapter | undefined {
    return this.providers.find((provider) => provider.id === providerId)
      ?.adapter;
  }

  handleRuntimeFailure(providerId: string, error: unknown): void {
    const descriptor = this.providers.find(
      (provider) => provider.id === providerId
    );
    if (!descriptor) {
      return;
    }
    this.recoveryCoordinator.handleRuntimeFailure(
      descriptor as MutableProviderDescriptor,
      error
    );
  }

  private async ensureGeminiAdapter(): Promise<void> {
    const descriptor = this.providers.find(
      (provider) => provider.id === "geminiCli"
    );
    if (!descriptor || descriptor.adapter) {
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
      if (!GeminiAdapter) {
        this.options.logger.warn(
          "Gemini provider adapter is not available; marking provider as inactive."
        );
        this.recoveryCoordinator.markProviderUnavailable(
          mutable,
          new Error("Gemini provider module is not installed"),
          "Gemini module is not installed.",
          true
        );
        return;
      }

      mutable.adapter = createGeminiAdapterInstance({
        adapterCtor: GeminiAdapter,
        config: this.options.config,
        credentialsDirectory: this.geminiCredentialsDirectory,
        defaultModel: this.geminiDefaultModel,
        settingsPath: this.geminiSettingsPath,
        thinkingLevelByModel: this.geminiThinkingLevelByModel,
        workspacePath: this.geminiWorkspacePath,
        createReporter: (scope) => this.createReporter(scope),
      });
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
      this.recoveryCoordinator.markProviderUnavailable(
        mutable,
        error,
        "Gemini module failed to load.",
        true
      );
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

  private async prepareProvider(
    descriptor: MutableProviderDescriptor
  ): Promise<void> {
    await this.recoveryCoordinator.prepareProvider(descriptor);
  }

  private async attemptProviderRecovery(providerId: string): Promise<void> {
    await this.recoveryCoordinator.attemptProviderRecovery(
      providerId,
      this.providers
    );
  }
}
