import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
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
    readonly thinkingLevelByModel?: Record<string, string>;
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
  readonly status: "active" | "inactive" | "degraded";
  readonly statusMessage?: string;
};

type ProviderAdapter = {
  initialize(): Promise<void>;
  createSession(workspacePath?: string): Promise<string>;
  resumeSession?(sessionId: string, workspacePath?: string): Promise<string>;
  closeSession(sessionId: string): Promise<void>;
  sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void>;
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
  macOS: "~/.npm-global/lib/node_modules/@google/gemini-cli/",
  linux: "~/.npm-global/lib/node_modules/@google/gemini-cli/",
  windows:
    "%USERPROFILE%\\AppData\\Roaming\\npm\\node_modules\\@google\\gemini-cli\\",
};

const PROVIDER_RECOVERY_INTERVAL_MS = 60_000;
const PROVIDERS_ROOT = path.join(homedir(), ".codeai-hub", "providers");

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
): Promise<GeminiAdapterCtor | null> => {
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
    logger.warn(
      "Gemini provider module is not available; Gemini provider will be inactive."
    );
    return null;
  }

  return bundledAdapter;
};

const resolveInstalledProviderPathFromPointer = (
  providerRoot: string
): string | null => {
  const latestPath = path.join(providerRoot, "latest");
  if (!existsSync(latestPath)) {
    return null;
  }
  try {
    const raw = readFileSync(latestPath, "utf8").trim();
    if (!raw) {
      return null;
    }
    const installDir = path.join(providerRoot, raw);
    const installMarker = path.join(installDir, "install.json");
    if (!existsSync(installMarker)) {
      return null;
    }
    return installDir;
  } catch {
    return null;
  }
};

const resolveInstalledProviderPathByScan = (
  providerRoot: string
): string | null => {
  try {
    const entries = readdirSync(providerRoot, { withFileTypes: true });
    let bestVersion: string | null = null;
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const candidateVersion = entry.name;
      const markerPath = path.join(
        providerRoot,
        candidateVersion,
        "install.json"
      );
      if (!existsSync(markerPath)) {
        continue;
      }
      if (!bestVersion || candidateVersion > bestVersion) {
        bestVersion = candidateVersion;
      }
    }
    if (!bestVersion) {
      return null;
    }
    return path.join(providerRoot, bestVersion);
  } catch {
    return null;
  }
};

const resolveInstalledProviderPath = (providerId: string): string | null => {
  const providerRoot = path.join(PROVIDERS_ROOT, providerId);
  if (!existsSync(providerRoot)) {
    return null;
  }
  return (
    resolveInstalledProviderPathFromPointer(providerRoot) ??
    resolveInstalledProviderPathByScan(providerRoot)
  );
};

const resolveClaudeModulePath = (): string | undefined => {
  const override = process.env.CLAUDE_MODULE_PATH;
  if (override?.trim()) {
    return override;
  }
  const installed = resolveInstalledProviderPath("claude");
  return installed ?? undefined;
};

const resolveCodexModulePath = (): string | undefined => {
  const override = process.env.CODEX_MODULE_PATH;
  if (override?.trim()) {
    return override;
  }
  const installed = resolveInstalledProviderPath("codex");
  return installed ?? undefined;
};

const resolveGeminiModulePath = (): string | undefined => {
  const override = process.env.GEMINI_MODULE_PATH;
  if (override?.trim()) {
    return override;
  }
  const installed = resolveInstalledProviderPath("gemini");
  return installed ?? undefined;
};

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
  private readonly retryTimers = new Map<string, NodeJS.Timeout>();
  private readonly pendingRetryProviders = new Set<string>();

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
    this.providers = this.initializeProviders();
    for (const providerId of this.pendingRetryProviders) {
      this.scheduleRetry(providerId);
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
    this.options.logger.error(
      "Provider runtime failure detected",
      error instanceof Error ? error : new Error(String(error)),
      { providerId }
    );
    const mutable = descriptor as MutableProviderDescriptor;
    this.markProviderDegraded(mutable, error);
    this.emitStatus({
      phase: "provider",
      scope: providerId,
      label: `${descriptor.name} became unavailable.`,
    });
    this.scheduleRetry(providerId);
  }

  private initializeProviders(): ProviderDescriptor[] {
    return [
      this.buildClaudeDescriptor(),
      this.buildCodexDescriptor(),
      this.buildGeminiDescriptor(),
    ];
  }

  private buildClaudeDescriptor(): ProviderDescriptor {
    const descriptor: MutableProviderDescriptor = {
      id: "claudeCodeCli",
      name: "Claude",
      description: "Using your authentication Claude Code CLI",
      status: "active",
    };
    this.tryAttachAdapter(
      () => this.createClaudeAdapter(),
      descriptor,
      "Claude CLI components are unavailable."
    );
    return descriptor;
  }

  private buildCodexDescriptor(): ProviderDescriptor {
    const descriptor: MutableProviderDescriptor = {
      id: "codexCli",
      name: "Codex",
      description: "Using your authentication Codex CLI",
      status: "active",
    };
    this.tryAttachAdapter(
      () => this.createCodexAdapter(),
      descriptor,
      "Codex CLI components are unavailable."
    );
    return descriptor;
  }

  private buildGeminiDescriptor(): ProviderDescriptor {
    return {
      id: "geminiCli",
      name: "Gemini",
      description: "Using your authentication Gemini CLI",
      status: "active",
    };
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
      if (!GeminiAdapter) {
        this.options.logger.warn(
          "Gemini provider adapter is not available; marking provider as inactive."
        );
        this.markProviderInactive(
          mutable,
          new Error("Gemini provider module is not installed")
        );
        this.scheduleRetry("geminiCli");
        return;
      }
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
          thinkingLevelByModel: this.geminiThinkingLevelByModel,
          settingsPath: this.geminiSettingsPath,
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
      this.markProviderInactive(mutable, error);
      this.scheduleRetry("geminiCli");
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

  private tryAttachAdapter(
    factory: () => ProviderAdapter,
    descriptor: MutableProviderDescriptor,
    failureLabel: string
  ): void {
    try {
      descriptor.adapter = factory();
    } catch (error) {
      this.handleAdapterConstructionFailure(descriptor, error, failureLabel);
    }
  }

  private createClaudeAdapter(): ProviderAdapter {
    return new this.claudeAdapterCtor({
      installerPaths: CLAUDE_INSTALLER_PATHS,
      workspace: {
        workspacePath: this.options.config.claudeWorkspacePath ?? process.cwd(),
        claudeProjectSlug: this.options.config.claudeProjectSlug,
        settingsPath: this.options.config.claudeSettingsPath,
        defaultModel: this.options.config.claudeDefaultModel,
      },
      reporter: this.createReporter("claude"),
    });
  }

  private createCodexAdapter(): ProviderAdapter {
    const {
      codexWorkspacePath,
      codexSandboxMode,
      codexApprovalMode,
      codexDefaultModel,
      codexDefaultReasoningEffort,
      codexSkipGitRepoCheck,
    } = this.options.config;

    return new this.codexAdapterCtor({
      installerPaths: CODEX_INSTALLER_PATHS,
      workspace: {
        workspacePath: codexWorkspacePath ?? process.cwd(),
        defaultSandboxMode: codexSandboxMode,
        defaultApprovalMode: codexApprovalMode,
        defaultModel: codexDefaultModel,
        defaultReasoningEffort: codexDefaultReasoningEffort,
        skipGitRepoCheck: codexSkipGitRepoCheck,
      },
      reporter: this.createReporter("codex"),
    });
  }

  private async prepareProvider(
    descriptor: MutableProviderDescriptor
  ): Promise<void> {
    if (!descriptor.adapter) {
      return;
    }
    this.emitStatus({
      phase: "provider",
      scope: descriptor.id,
      label: `Preparing ${descriptor.name} module...`,
    });
    try {
      await descriptor.adapter.initialize();
      this.markProviderActive(descriptor);
      this.emitStatus({
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
      this.emitStatus({
        phase: "provider",
        scope: descriptor.id,
        label: `Failed to initialize ${descriptor.name}.`,
      });
      this.scheduleRetry(descriptor.id);
    }
  }

  private handleAdapterConstructionFailure(
    descriptor: MutableProviderDescriptor,
    error: unknown,
    failureLabel: string
  ): void {
    this.options.logger.error(
      "Provider adapter construction failed",
      error instanceof Error ? error : new Error(String(error)),
      { providerId: descriptor.id }
    );
    this.markProviderInactive(descriptor, error);
    this.pendingRetryProviders.add(descriptor.id);
    this.emitStatus({
      phase: "provider",
      scope: descriptor.id,
      label: failureLabel,
    });
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
    this.clearRetry(descriptor.id);
  }

  private markProviderDegraded(
    descriptor: MutableProviderDescriptor,
    error: unknown
  ): void {
    descriptor.status = "degraded";
    descriptor.statusMessage = this.formatProviderError(descriptor.id, error);
    this.clearRetry(descriptor.id);
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
      default:
        return "Claude CLI is unavailable. CodeAI Hub runs provider-home auth bootstrap automatically; if it still fails, run `claude /login`, then use Settings → General → Restart Core to retry. If it still fails, run `HOME=~/.codeai-hub/providers/claude/home claude /login`, then restart Core";
    }
  }

  private clearRetry(providerId: string): void {
    const timer = this.retryTimers.get(providerId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(providerId);
    }
  }

  private scheduleRetry(providerId: string): void {
    if (this.retryTimers.has(providerId)) {
      return;
    }
    const timer = setTimeout(() => {
      this.retryTimers.delete(providerId);
      this.attemptProviderRecovery(providerId).catch((error) => {
        this.options.logger.warn("Provider retry failed", {
          providerId,
          message: error instanceof Error ? error.message : String(error),
        });
        this.scheduleRetry(providerId);
      });
    }, PROVIDER_RECOVERY_INTERVAL_MS);
    this.retryTimers.set(providerId, timer);
  }

  private async attemptProviderRecovery(providerId: string): Promise<void> {
    const descriptor = this.providers.find(
      (provider) => provider.id === providerId
    );
    if (!descriptor) {
      return;
    }
    const mutable = descriptor as MutableProviderDescriptor;

    if (providerId === "geminiCli") {
      await this.ensureGeminiAdapter();
      if (!mutable.adapter) {
        this.scheduleRetry(providerId);
        return;
      }
      await this.prepareProvider(mutable);
      return;
    }

    if (!mutable.adapter) {
      try {
        mutable.adapter =
          providerId === "claudeCodeCli"
            ? this.createClaudeAdapter()
            : this.createCodexAdapter();
      } catch (error) {
        this.options.logger.error(
          "Provider adapter construction failed during retry",
          error instanceof Error ? error : new Error(String(error)),
          { providerId }
        );
        this.markProviderInactive(mutable, error);
        this.emitStatus({
          phase: "provider",
          scope: providerId,
          label: `${descriptor.name} CLI components are unavailable.`,
        });
        this.scheduleRetry(providerId);
        return;
      }
    }

    await this.prepareProvider(mutable);
  }
}
