import { createRequire } from "node:module";
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
  createGlmAdapterInstance,
  createGlmOpenCodeAdapterInstance,
  createKimiAdapterInstance,
  createProviderDescriptors,
  type KimiAdapterCtor,
} from "./provider-descriptor-factory";
import {
  resolveClaudeModulePath,
  resolveCodexModulePath,
  resolveGlmModulePath,
  resolveGlmOpenCodeModulePath,
} from "./provider-installed-path-resolver";
import {
  loadClaudeAdapterCtor,
  loadCodexAdapterCtor,
  loadGlmAdapterCtor,
  loadGlmOpenCodeAdapterCtor,
} from "./provider-module-loader";
import type {
  ClaudeAdapterCtor,
  CodexAdapterCtor,
  GlmAdapterCtor,
  GlmOpenCodeAdapterCtor,
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

type DisposableProviderAdapter = ProviderAdapter & {
  readonly dispose: () => void;
};

const hasDisposableAdapter = (
  adapter: ProviderAdapter | undefined
): adapter is DisposableProviderAdapter =>
  typeof (adapter as { readonly dispose?: unknown } | undefined)?.dispose ===
  "function";

export class ProviderRegistry {
  private readonly providers: ProviderDescriptor[];
  private readonly claudeAdapterCtor: ClaudeAdapterCtor;
  private readonly codexAdapterCtor: CodexAdapterCtor;
  private readonly kimiAdapterCtor: KimiAdapterCtor;
  private readonly glmAdapterCtor: GlmAdapterCtor;
  private readonly glmOpenCodeAdapterCtor: GlmOpenCodeAdapterCtor;
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
    this.kimiAdapterCtor = loadBundledKimiAdapterCtor();
    this.glmAdapterCtor = loadGlmAdapterCtor(
      resolveGlmModulePath(),
      this.options.logger
    );
    this.glmOpenCodeAdapterCtor = loadGlmOpenCodeAdapterCtor(
      resolveGlmOpenCodeModulePath(),
      this.options.logger
    );
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
      createKimiAdapter: () =>
        createKimiAdapterInstance({
          config: this.options.config,
          createReporter: (scope) => this.createReporter(scope),
          kimiAdapterCtor: this.kimiAdapterCtor,
        }),
      createGlmAdapter: () =>
        createGlmAdapterInstance({
          config: this.options.config,
          createReporter: (scope) => this.createReporter(scope),
          glmAdapterCtor: this.glmAdapterCtor,
        }),
      createGlmOpenCodeAdapter: () =>
        createGlmOpenCodeAdapterInstance({
          config: this.options.config,
          createReporter: (scope) => this.createReporter(scope),
          glmOpenCodeAdapterCtor: this.glmOpenCodeAdapterCtor,
        }),
      emitStatus: (event) => this.emitStatus(event),
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
      kimiAdapterCtor: this.kimiAdapterCtor,
      glmAdapterCtor: this.glmAdapterCtor,
      glmOpenCodeAdapterCtor: this.glmOpenCodeAdapterCtor,
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
    await Promise.all(
      this.providers.map((provider) =>
        this.prepareProvider(provider as MutableProviderDescriptor)
      )
    );
  }

  markStartupWarmupPending(): void {
    for (const provider of this.providers) {
      const mutable = provider as MutableProviderDescriptor;
      if (mutable.status !== "active") {
        continue;
      }
      mutable.status = "degraded";
      mutable.statusMessage = `${mutable.name} is starting. Provider actions become available after startup warmup finishes.`;
    }
  }

  listProviders(): Provider[] {
    return this.providers.map((provider) => this.toProviderSnapshot(provider));
  }

  getAdapter(providerId: string): ProviderAdapter | undefined {
    const provider = this.providers.find((item) => item.id === providerId);
    if (provider?.status !== "active") {
      return undefined;
    }
    return provider.adapter;
  }

  getDescriptor(providerId: string): ProviderDescriptor | undefined {
    return this.providers.find((provider) => provider.id === providerId);
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

  dispose(): void {
    this.recoveryScheduler.dispose();
    for (const provider of this.providers) {
      const adapter = provider.adapter;
      if (!hasDisposableAdapter(adapter)) {
        continue;
      }
      try {
        adapter.dispose();
      } catch (error) {
        this.options.logger.warn("Provider adapter dispose failed", {
          error: error instanceof Error ? error.message : String(error),
          providerId: provider.id,
        });
      }
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

  private toProviderSnapshot(provider: ProviderDescriptor): Provider {
    const { adapter: _adapter, ...snapshot } = provider;
    return snapshot;
  }
}

const loadBundledKimiAdapterCtor = (): KimiAdapterCtor => {
  const requireModule = createRequire(
    process.argv[1] ?? `${process.cwd()}/package.json`
  );
  const bundled = requireModule("@codeai-hub/kimi-module") as {
    readonly KimiProviderAdapter: KimiAdapterCtor;
  };
  return bundled.KimiProviderAdapter;
};
