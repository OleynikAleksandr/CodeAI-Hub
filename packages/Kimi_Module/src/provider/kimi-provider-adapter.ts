import path from "node:path";
import { normalizeKimiWireRequest } from "../messaging/kimi-request-failure-normalizer";
import { KimiSessionLifecycle } from "../session/kimi-session-lifecycle";
import { KimiWireProcessBridge } from "../wire/kimi-wire-process";
import { type KimiWireRequest, KimiWireRouter } from "../wire/kimi-wire-router";
import {
  buildKimiCliEnvironment,
  ensureKimiProviderHome,
  type KimiCliEnvironment,
  type KimiRuntimeHome,
  materializeKimiManagedAgentProfile,
} from "./kimi-managed-agent-profile";
import { KimiNativeTokenUsageReader } from "./kimi-native-token-usage-reader";
import {
  KimiSessionEventRouter,
  readKimiRuntimeSessionId,
} from "./kimi-session-event-router";
import { KimiUsageLimitsReader } from "./kimi-usage-limits-reader";
import {
  KimiWorkspaceOverrideState,
  reportKimiWorkspaceOverride,
} from "./kimi-workspace-override-state";

export const KIMI_PROVIDER_ID = "kimiCode" as const;

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
  readonly thinkingEnabled?: boolean;
  readonly workspacePath?: string;
}

export interface KimiModuleOptions {
  readonly reporter?: ModuleReporter;
  readonly workspace: KimiWorkspaceOptions;
}

export interface KimiSessionEvent {
  readonly payload?: unknown;
  readonly postTurnTokenUsageUnavailable?: true;
  readonly type: string;
}
interface KimiNativeRequestCaptureOptions {
  readonly captureId: string;
  readonly recordAppliedInputEnvelope?: (envelope: {
    readonly kind: "kimi";
    readonly providerHomePath: string | null;
    readonly selectedModelId: string | null;
    readonly userConfigPath: string | null;
    readonly wireJsonlPath: string | null;
  }) => Promise<void> | void;
  readonly recordDiagnosticContext?: (record: {
    readonly kind: string;
    readonly payload: unknown;
  }) => Promise<void> | void;
  readonly scenarioId?: string | null;
  readonly selectedModelId?: string | null;
  readonly workflowPrompt?: string | null;
  readonly workspacePath: string;
}

export class KimiProviderAdapter {
  private readonly listeners = new Map<string, Set<SessionListener>>();
  private readonly nativeTokenUsageReader = new KimiNativeTokenUsageReader();
  private readonly options: KimiModuleOptions;
  private readonly usageLimitsReader = new KimiUsageLimitsReader();
  private readonly sessionEventRouter = new KimiSessionEventRouter();
  private cliEnvironment: KimiCliEnvironment | null = null;
  private currentThinkingEnabled: boolean | undefined;
  private runtimeHome: KimiRuntimeHome | null = null;
  private sessionLifecycle: KimiSessionLifecycle | null = null;
  private readonly workspaceOverride: KimiWorkspaceOverrideState;
  private wireProcessBridge: KimiWireProcessBridge | null = null;
  private wireRouter: KimiWireRouter | null = null;
  private initialized = false;

  constructor(options: KimiModuleOptions) {
    this.options = options;
    this.currentThinkingEnabled = options.workspace.thinkingEnabled;
    this.workspaceOverride = new KimiWorkspaceOverrideState(
      this.resolveRuntimeWorkspacePath(options.workspace.workspacePath)
    );
  }

  async initialize(): Promise<void> {
    await this.configureWireRuntime(
      this.workspaceOverride.getActiveWorkspacePath() ?? undefined
    );
    this.initialized = true;
  }

  async createSession(workspacePath?: string): Promise<string> {
    this.assertInitialized();
    const override = this.workspaceOverride.resolve(
      this.resolveRuntimeWorkspacePath(workspacePath)
    );
    reportKimiWorkspaceOverride(this.options.reporter, override);
    if (override.applied) {
      await this.configureWireRuntime(override.workspacePath ?? undefined);
    }
    const sessionId = await this.requireSessionLifecycle().create();
    this.workspaceOverride.markRuntimeStarted();
    return sessionId;
  }

  async resumeSession(sessionId: string): Promise<string> {
    this.assertInitialized();
    const providerSessionId =
      await this.requireSessionLifecycle().resume(sessionId);
    this.workspaceOverride.markRuntimeStarted();
    return providerSessionId;
  }

  private async configureWireRuntime(
    workspacePath: string | undefined
  ): Promise<void> {
    const cliEnvironment = buildKimiCliEnvironment({
      defaultModel: this.options.workspace.defaultModel,
      providerHomePath: this.options.workspace.providerHomePath,
      thinkingEnabled: this.currentThinkingEnabled,
      userConfigPath: this.options.workspace.configPath,
      workspacePath,
    });
    this.cliEnvironment = cliEnvironment;
    this.runtimeHome = await ensureKimiProviderHome(cliEnvironment.runtimeHome);
    await materializeKimiManagedAgentProfile(this.runtimeHome.providerHomePath);
    this.wireRouter = this.createWireRouter();
    this.wireProcessBridge = this.createWireProcessBridge();
    this.sessionLifecycle = new KimiSessionLifecycle({
      cwd:
        this.workspaceOverride.getActiveWorkspacePath() ??
        this.requireRuntimeHome().providerHomePath,
      defaultModel: cliEnvironment.usesEnvironmentModel
        ? undefined
        : this.options.workspace.defaultModel,
      processBridge: this.wireProcessBridge,
      router: this.wireRouter,
    });
    this.initialized = true;
    this.options.reporter?.info?.("Kimi provider scaffold initialized", {
      cliArgs: cliEnvironment.args,
      cliCommand: cliEnvironment.command,
      providerId: KIMI_PROVIDER_ID,
      providerHomePath: this.runtimeHome.providerHomePath,
      usesEnvironmentModel: cliEnvironment.usesEnvironmentModel,
      userConfigPath: this.runtimeHome.userConfigPath,
      wireProcessReady: this.wireProcessBridge !== null,
      wireRouterReady: this.wireRouter !== null,
    });
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

  subscribe(
    sessionId: string,
    listener: (payload: unknown) => void
  ): () => void {
    return this.onSessionEvent(sessionId, (payload) => listener(payload));
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    this.assertInitialized();
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Cannot send an empty Kimi message.");
    }
    this.dispatchMessage(sessionId, this.createLifecycleEvent("turn_started"));
    try {
      await this.requireSessionLifecycle().send(sessionId, trimmedContent);
      for (const event of this.sessionEventRouter.flush(sessionId)) {
        this.dispatchMessage(sessionId, event);
      }
      const tokenUsageEvent =
        await this.nativeTokenUsageReader.readEvent(sessionId);
      if (tokenUsageEvent) {
        this.dispatchMessage(sessionId, tokenUsageEvent);
      }
      this.dispatchMessage(
        sessionId,
        this.createLifecycleEvent("turn_completed")
      );
    } catch (error) {
      this.dispatchMessage(
        sessionId,
        this.createLifecycleEvent("turn_failed", {
          errorMessage: error instanceof Error ? error.message : String(error),
        })
      );
      throw error;
    }
  }

  cancel(sessionId: string): Promise<void> {
    this.assertInitialized();
    return this.requireSessionLifecycle().cancel(sessionId);
  }

  async captureNativeRequest(
    options: KimiNativeRequestCaptureOptions
  ): Promise<void> {
    this.assertInitialized();
    const runtimeHome = this.requireRuntimeHome();
    const wireJsonlPath = path.join(runtimeHome.providerHomePath, "wire.jsonl");
    const selectedModelId =
      options.selectedModelId ?? this.options.workspace.defaultModel ?? null;
    await options.recordAppliedInputEnvelope?.({
      kind: "kimi",
      providerHomePath: runtimeHome.providerHomePath,
      selectedModelId,
      userConfigPath: runtimeHome.userConfigPath,
      wireJsonlPath,
    });
    await options.recordDiagnosticContext?.({
      kind: "kimi_wire_capture",
      payload: {
        captureId: options.captureId,
        promptLength: options.workflowPrompt?.length ?? 0,
        scenarioId: options.scenarioId ?? null,
        selectedModelId,
        userConfigPath: runtimeHome.userConfigPath,
        wireJsonlPath,
        workspacePath: options.workspacePath,
      },
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    this.listeners.delete(sessionId);
    this.sessionEventRouter.close(sessionId);
    await this.requireSessionLifecycle().close(sessionId);
  }

  reconfigureThinking(_enabled: boolean): Promise<boolean> {
    this.currentThinkingEnabled = true;
    return Promise.resolve(false);
  }

  async refreshUsageLimits(params: {
    readonly broadcast: (event: unknown) => void;
    readonly providerSessionId: string;
  }): Promise<void> {
    const userConfigPath = this.runtimeHome?.userConfigPath ?? null;
    const livePayload = userConfigPath
      ? await this.usageLimitsReader
          .read({ userConfigPath })
          .catch((error: unknown) => {
            this.options.reporter?.warn?.("Kimi usage limits read failed", {
              errorMessage:
                error instanceof Error ? error.message : String(error),
            });
            return null;
          })
      : null;
    params.broadcast(
      livePayload
        ? {
            ...livePayload,
            providerSessionId: params.providerSessionId,
          }
        : this.createUsageLimitsUnavailableEvent(params.providerSessionId)
    );
  }

  private createUsageLimitsUnavailableEvent(providerSessionId: string): {
    readonly data: Record<string, unknown>;
    readonly providerScopeKey: string;
    readonly providerSessionId: string;
    readonly usageLimits: null;
  } {
    return {
      providerScopeKey: "kimi:global",
      usageLimits: null,
      data: {
        kind: "usage_limits",
        collectedAt: new Date().toISOString(),
        diagnostics: {
          force: false,
          fromCache: false,
          readerRegistered: false,
          result: "unavailable",
          source: "kimi_unavailable",
        },
        providerScopeKey: "kimi:global",
        source: "kimi_unavailable",
        usageLimitLabels: {
          currentSession: "5h",
          currentWeekAllModels: "Weekly",
        },
        usageLimits: null,
      },
      providerSessionId,
    };
  }

  private createWireProcessBridge(): KimiWireProcessBridge {
    const cliEnvironment = this.requireCliEnvironment();
    return new KimiWireProcessBridge({
      args: cliEnvironment.args,
      command: cliEnvironment.command,
      cwd:
        this.workspaceOverride.getActiveWorkspacePath() ??
        this.requireRuntimeHome().providerHomePath,
      env: cliEnvironment.env,
      onLine: (line) => {
        this.requireWireRouter().handleLine(line);
      },
      onStderr: (line) => {
        this.options.reporter?.warn?.("Kimi ACP stderr line received", {
          line,
        });
      },
    });
  }

  private resolveRuntimeWorkspacePath(
    workspacePath: string | undefined
  ): string | undefined {
    const trimmedWorkspacePath = workspacePath?.trim();
    if (!trimmedWorkspacePath) {
      return;
    }
    const resolvedWorkspacePath = path.resolve(trimmedWorkspacePath);
    if (resolvedWorkspacePath === path.parse(resolvedWorkspacePath).root) {
      this.options.reporter?.warn?.(
        "Kimi workspace root resolved to filesystem root; using provider home fallback",
        { workspacePath: resolvedWorkspacePath }
      );
      return;
    }
    return resolvedWorkspacePath;
  }

  private createWireRouter(): KimiWireRouter {
    return new KimiWireRouter({
      onEvent: (params) => this.handleWireEvent(params),
      onMalformedFrame: (line, error) => {
        this.options.reporter?.warn?.("Malformed Kimi ACP frame received", {
          errorMessage: error.message,
          line,
        });
      },
      onRequest: (request) => this.handleProviderRequest(request),
      sendJson: (message) => this.requireWireProcessBridge().sendJson(message),
    });
  }

  private handleWireEvent(params: unknown): void {
    const targetSessionId = readKimiRuntimeSessionId(params);
    this.dispatchEvents(
      targetSessionId,
      this.sessionEventRouter.normalize(targetSessionId, params)
    );
  }
  private dispatchEvents(
    sessionId: string | null,
    events: readonly KimiSessionEvent[]
  ): void {
    if (sessionId) {
      for (const event of events) {
        this.dispatchMessage(sessionId, event);
      }
      return;
    }
    for (const listenerSessionId of this.listeners.keys()) {
      for (const event of events) {
        this.dispatchMessage(listenerSessionId, event);
      }
    }
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
  private createLifecycleEvent(
    type: "turn_completed" | "turn_failed" | "turn_started",
    payload?: Record<string, unknown>
  ): KimiSessionEvent {
    const event = {
      payload: {
        provider: "kimi",
        timestamp: new Date().toISOString(),
        ...(payload ?? {}),
      },
      type,
    };
    return type === "turn_completed"
      ? { ...event, postTurnTokenUsageUnavailable: true }
      : event;
  }

  private handleProviderRequest(request: KimiWireRequest): unknown {
    const event = normalizeKimiWireRequest(request);
    this.dispatchEvents(readKimiRuntimeSessionId(request), [event]);
    if (request.method !== "session/request_permission") {
      return {};
    }
    return {
      outcome: {
        optionId: this.selectPermissionOptionId(request.params),
        outcome: "selected",
      },
    };
  }

  private selectPermissionOptionId(params: unknown): string {
    const options =
      isRecord(params) && Array.isArray(params.options) ? params.options : [];
    for (const kind of ["allow_always", "allow_once"]) {
      const option = options.find(
        (candidate) =>
          isRecord(candidate) &&
          candidate.kind === kind &&
          typeof candidate.optionId === "string"
      );
      if (isRecord(option) && typeof option.optionId === "string") {
        return option.optionId;
      }
    }
    const firstOption = options.find(isRecord);
    return typeof firstOption?.optionId === "string"
      ? firstOption.optionId
      : "allow";
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

  private requireRuntimeHome(): KimiRuntimeHome {
    if (!this.runtimeHome) {
      throw new Error("Kimi runtime home is not initialized.");
    }
    return this.runtimeHome;
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
