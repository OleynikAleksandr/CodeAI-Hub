import type {
  RuntimeStatusEvent,
  RuntimeStatusPhase,
} from "../status/runtime-status-reporter";
import type { Logger } from "../telemetry/logger";
import type {
  MutableProviderDescriptor,
  ProviderAdapter,
  ProviderDescriptor,
} from "./provider-module-loader.types";

interface ProviderRecoveryCoordinatorOptions {
  readonly clearRetry: (providerId: string) => void;
  readonly createClaudeAdapter: () => ProviderAdapter;
  readonly createCodexAdapter: () => ProviderAdapter;
  readonly createGlmAdapter: () => ProviderAdapter;
  readonly createGlmOpenCodeAdapter: () => ProviderAdapter;
  readonly createKimiAdapter: () => ProviderAdapter;
  readonly emitStatus: (
    event: Omit<RuntimeStatusEvent, "timestamp" | "phase"> & {
      readonly phase: RuntimeStatusPhase;
    }
  ) => void;
  readonly ensureGeminiAdapter: () => Promise<void>;
  readonly logger: Logger;
  readonly scheduleRetry: (providerId: string) => void;
}

export class ProviderRecoveryCoordinator {
  private readonly options: ProviderRecoveryCoordinatorOptions;

  constructor(options: ProviderRecoveryCoordinatorOptions) {
    this.options = options;
  }

  handleRuntimeFailure(
    descriptor: MutableProviderDescriptor,
    error: unknown
  ): void {
    this.options.logger.error(
      "Provider runtime failure detected",
      error instanceof Error ? error : new Error(String(error)),
      { providerId: descriptor.id }
    );
    this.markProviderDegraded(descriptor, error);
    this.options.emitStatus({
      phase: "provider",
      scope: descriptor.id,
      label: `${descriptor.name} became unavailable.`,
    });
    this.options.scheduleRetry(descriptor.id);
  }

  handleAdapterConstructionFailure(
    descriptor: MutableProviderDescriptor,
    error: unknown,
    failureLabel: string,
    pendingRetryProviders: Set<string>
  ): void {
    this.options.logger.error(
      "Provider adapter construction failed",
      error instanceof Error ? error : new Error(String(error)),
      { providerId: descriptor.id }
    );
    this.markProviderInactive(descriptor, error);
    pendingRetryProviders.add(descriptor.id);
    this.options.emitStatus({
      phase: "provider",
      scope: descriptor.id,
      label: failureLabel,
    });
  }

  markProviderUnavailable(
    descriptor: MutableProviderDescriptor,
    error: unknown,
    label: string,
    scheduleRetry = false
  ): void {
    this.markProviderInactive(descriptor, error);
    this.options.emitStatus({
      phase: "provider",
      scope: descriptor.id,
      label,
    });
    if (scheduleRetry) {
      this.options.scheduleRetry(descriptor.id);
    }
  }

  async prepareProvider(descriptor: MutableProviderDescriptor): Promise<void> {
    if (!descriptor.adapter) {
      return;
    }

    this.options.emitStatus({
      phase: "provider",
      scope: descriptor.id,
      label: `Preparing ${descriptor.name} module...`,
    });
    try {
      await descriptor.adapter.initialize();
      this.markProviderActive(descriptor);
      this.options.emitStatus({
        phase: "provider",
        scope: descriptor.id,
        label: `${descriptor.name} is ready.`,
      });
    } catch (error) {
      this.options.logger.error(
        "Provider initialization failed",
        error instanceof Error ? error : new Error(String(error)),
        { providerId: descriptor.id }
      );
      this.markProviderInactive(descriptor, error);
      this.options.emitStatus({
        phase: "provider",
        scope: descriptor.id,
        label: `Failed to initialize ${descriptor.name}.`,
      });
      this.options.scheduleRetry(descriptor.id);
    }
  }

  async attemptProviderRecovery(
    providerId: string,
    providers: readonly ProviderDescriptor[]
  ): Promise<void> {
    const descriptor = providers.find((provider) => provider.id === providerId);
    if (!descriptor) {
      return;
    }
    const mutable = descriptor as MutableProviderDescriptor;

    if (providerId === "geminiCli") {
      await this.options.ensureGeminiAdapter();
      if (!mutable.adapter) {
        this.options.scheduleRetry(providerId);
        return;
      }
      await this.prepareProvider(mutable);
      return;
    }

    if (!mutable.adapter) {
      try {
        mutable.adapter = this.createProviderAdapter(providerId);
      } catch (error) {
        this.options.logger.error(
          "Provider adapter construction failed during retry",
          error instanceof Error ? error : new Error(String(error)),
          { providerId }
        );
        this.markProviderInactive(mutable, error);
        this.options.emitStatus({
          phase: "provider",
          scope: providerId,
          label: `${descriptor.name} CLI components are unavailable.`,
        });
        this.options.scheduleRetry(providerId);
        return;
      }
    }

    await this.prepareProvider(mutable);
  }

  private createProviderAdapter(providerId: string): ProviderAdapter {
    switch (providerId) {
      case "claudeCodeCli":
        return this.options.createClaudeAdapter();
      case "kimiCode":
        return this.options.createKimiAdapter();
      case "glmNative":
        return this.options.createGlmAdapter();
      case "glmOpenCode":
        return this.options.createGlmOpenCodeAdapter();
      default:
        return this.options.createCodexAdapter();
    }
  }

  private markProviderInactive(
    descriptor: MutableProviderDescriptor,
    error: unknown
  ): void {
    descriptor.status = "inactive";
    descriptor.statusMessage = this.formatProviderError(descriptor.id, error);
    descriptor.adapter = undefined;
  }

  private markProviderActive(descriptor: MutableProviderDescriptor): void {
    descriptor.status = "active";
    descriptor.statusMessage = undefined;
    this.options.clearRetry(descriptor.id);
  }

  private markProviderDegraded(
    descriptor: MutableProviderDescriptor,
    error: unknown
  ): void {
    descriptor.status = "degraded";
    descriptor.statusMessage = this.formatProviderError(descriptor.id, error);
    this.options.clearRetry(descriptor.id);
  }

  private formatProviderError(providerId: string, error: unknown): string {
    const reason =
      error instanceof Error && error.message
        ? error.message
        : String(error ?? "Unknown error");
    const hint = this.getProviderRecoveryHint(providerId);
    return `${hint} (Reason: ${reason})`;
  }

  private getProviderRecoveryHint(providerId: string): string {
    switch (providerId) {
      case "codexCli":
        return "Codex CLI is unavailable. Re-authenticate the CLI, verify your limits, then use Settings → General → Restart Core to retry";
      case "geminiCli":
        return "Gemini CLI is unavailable. Run `gemini login`, confirm credentials, then use Settings → General → Restart Core to retry";
      case "kimiCode":
        return "Kimi CLI is unavailable. Confirm `kimi` is installed and logged in, then use Settings → General → Restart Core to retry";
      case "glmOpenCode":
        return 'OpenCode wrapper is unavailable. Confirm OpenCode is installed and that the needed provider is authenticated in OpenCode. CodeAI Hub copies the OpenCode auth catalog into its isolated runtime; for Z.AI you can still set ~/.codeai-hub/providers/opencode/config.json { "apiKey": "zai-..." } or ZAI_API_KEY. Then use Settings -> General -> Restart Core to retry';
      case "glmNative":
        return "GLM native API is unavailable. Set the Z.AI API key in Settings or export ZAI_API_KEY, then use Settings -> General -> Restart Core to retry";
      default:
        return "Claude CLI is unavailable. CodeAI Hub runs provider-home auth bootstrap automatically; if it still fails, run `claude /login`, then use Settings → General → Restart Core to retry. If it still fails, run `HOME=~/.codeai-hub/providers/claude/home claude /login`, then restart Core";
    }
  }
}
