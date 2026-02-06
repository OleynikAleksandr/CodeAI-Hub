import crypto from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import type { CoreConfig } from "../../config";
import { FlowNodeContinuityFacade } from "../../flow-node-continuity/flow-node-continuity-facade";
import type { ProviderRegistry } from "../../provider-registry";
import type { TokenUsageSnapshot } from "../../session-continuity/continuity-types";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import {
  computeRemainingPercent,
  extractTokenUsage,
  isBelowRemainingPercentThreshold,
} from "../../session-continuity/token-usage";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import { listUnifiedSessionWorkspaceSlugs } from "../../unified-session/workspace-slugs";
import { DescriptionStepStore } from "../../workflow/description";
import { type BridgeEvent, serializeSession } from "../types";
import { QuestionnaireCuratorFacade } from "./questionnaire-curator-facade";

type ProviderAdapter = NonNullable<ReturnType<ProviderRegistry["getAdapter"]>>;

type ProviderSessionResolution =
  | {
      readonly providerSessionId: string;
      readonly didResume: boolean;
      readonly supportsImmediateBinding: boolean;
    }
  | { readonly error: string };

export type ProviderSessionBinding = {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
};

export type ProviderEventEnvelope = {
  readonly type?: string;
  readonly payload?: unknown;
};

export type DialogMessagePayload = {
  readonly role?: string;
  readonly content?: unknown;
  readonly timestamp?: string;
};

type MessageContentPayload =
  | string
  | {
      readonly text?: unknown;
      readonly content?: unknown;
      readonly turnOptions?: unknown;
    };

type MessageContentExtraction = {
  readonly content: string;
  readonly turnOptions?: Record<string, unknown>;
};

type SessionIdChangedPayload = {
  readonly newId?: string;
};

type ProviderErrorEnvelope = {
  readonly provider?: unknown;
  readonly message?: unknown;
  readonly error?: unknown;
  readonly payload?: unknown;
  readonly type?: unknown;
};

type FlowNodeRolloverPhase =
  | "start"
  | "create_report_sent"
  | "waiting_for_report"
  | "report_ready"
  | "new_session_created"
  | "resume_sent"
  | "failed";

type FlowNodeRolloverNotification = {
  readonly kind: "flow_node_rollover";
  readonly phase: FlowNodeRolloverPhase;
  readonly sourceSessionId: string;
  readonly nextSessionId?: string;
  readonly providerId: string;
  readonly stageId: string;
  readonly runSlug: string | null;
  readonly remainingPercent?: number;
  readonly thresholdPercent?: number;
  readonly reportPath?: string;
  readonly tmpReportPath?: string;
  readonly error?: string;
  readonly timestamp: string;
};

type ContinuityLockState = "locked" | "unlocked";

type ContinuityLockReason =
  | "threshold_reached"
  | "report_in_progress"
  | "resume_bootstrap"
  | "resume_ready"
  | "resume_failed"
  | "resume_timeout";

type ContinuityLockPayload = {
  readonly kind: "continuity_lock";
  readonly state: ContinuityLockState;
  readonly rolloverId: string;
  readonly sourceSessionId: string;
  readonly targetSessionId?: string;
  readonly stageId: string;
  readonly runSlug: string | null;
  readonly reason: ContinuityLockReason;
  readonly timestamp: string;
};

type FlowNodeContinuityLockContext = {
  readonly rolloverId: string;
  readonly sourceSessionId: string;
  readonly targetSessionId?: string;
  readonly stageId: string;
  readonly runSlug: string | null;
  readonly awaitingBootstrapTurn: boolean;
};

type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "diagram_facades";

type WorkflowTurnOptionsResolution = {
  readonly turnOptions?: Record<string, unknown>;
  readonly appliedSchema: boolean;
  readonly source: "turnOptions" | "template" | "none";
  readonly finalize: boolean;
  readonly stageMatched: boolean;
};

const WORKFLOW_STAGE_SET = new Set<WorkflowStageId>([
  "description",
  "virtual_simulation",
  "diagram_modules",
  "diagram_facades",
]);

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");

const DEFAULT_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 30;
const MIN_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
const MAX_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;
const FLOW_NODE_CONTINUITY_RESUME_TIMEOUT_MS = 90_000;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeContinuityThresholdPercent = (options: {
  readonly raw: unknown;
  readonly fallback: number;
}): number => {
  const numeric =
    typeof options.raw === "number" ? options.raw : Number(options.raw);
  if (!Number.isFinite(numeric)) {
    return clampNumber(
      options.fallback,
      MIN_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
      MAX_CONTINUITY_REMAINING_PERCENT_THRESHOLD
    );
  }
  return clampNumber(
    numeric,
    MIN_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    MAX_CONTINUITY_REMAINING_PERCENT_THRESHOLD
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractContinuityThresholdPercentFromSettings = (options: {
  readonly settings: unknown;
  readonly providerKey: "claude" | "codex";
  readonly fallback: number;
}): number => {
  if (!isRecord(options.settings)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  const providers = options.settings.providers;
  if (!isRecord(providers)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  const provider = providers[options.providerKey];
  if (!isRecord(provider)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  const sessionContinuity = provider.sessionContinuity;
  if (!isRecord(sessionContinuity)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  return normalizeContinuityThresholdPercent({
    raw: sessionContinuity.remainingPercentThreshold,
    fallback: options.fallback,
  });
};

const FINALIZE_TRIGGER_PATTERN =
  /(^|[\s,.;:!?])(?:ок|ok|утверждаю|approve|approved)(?=$|[\s,.;:!?])/i;

const stripOutputSchema = (
  turnOptions?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (!turnOptions) {
    return;
  }
  if (!("outputSchema" in turnOptions)) {
    return turnOptions;
  }
  const { outputSchema: _ignored, ...rest } = turnOptions;
  return Object.keys(rest).length > 0 ? rest : undefined;
};

const resolveWorkflowStage = (
  stage: string | null | undefined
): WorkflowStageId | null =>
  stage && WORKFLOW_STAGE_SET.has(stage as WorkflowStageId)
    ? (stage as WorkflowStageId)
    : null;

const isFinalizeTrigger = (content: string): boolean => {
  const normalized = content.trim().replace(/[\\/]/g, " ");
  if (!normalized) {
    return false;
  }
  return FINALIZE_TRIGGER_PATTERN.test(normalized);
};

const resolveWorkflowTurnOptions = (params: {
  readonly stage: string | null | undefined;
  readonly content: string;
  readonly turnOptions?: Record<string, unknown>;
}): WorkflowTurnOptionsResolution => {
  const stage = resolveWorkflowStage(params.stage);
  const shouldFinalize = isFinalizeTrigger(params.content);
  if (!stage) {
    return {
      turnOptions: params.turnOptions,
      appliedSchema: false,
      source: "none",
      finalize: shouldFinalize,
      stageMatched: false,
    };
  }

  return {
    turnOptions: stripOutputSchema(params.turnOptions),
    appliedSchema: false,
    source: "none",
    finalize: shouldFinalize,
    stageMatched: true,
  };
};

export type SessionRequestHandlerOptions = {
  readonly config: CoreConfig;
  readonly sessionManager: SessionManager;
  readonly providerRegistry: ProviderRegistry;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly logger: Logger;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly stateBroadcaster: () => void;
  readonly continuityClock?: () => string;
};

export class SessionRequestHandler {
  private readonly providerSessions = new Map<string, ProviderSessionBinding>();
  private readonly config: CoreConfig;
  private readonly sessionManager: SessionManager;
  private readonly providerRegistry: ProviderRegistry;
  private readonly sessionStorage: UnifiedSessionStorage;
  private readonly logger: Logger;
  private readonly questionnaireCurator: QuestionnaireCuratorFacade;
  private readonly broadcaster: (event: BridgeEvent) => void;
  private readonly stateBroadcaster: () => void;
  private readonly continuity: SessionContinuityFacade;
  private readonly descriptionStepStore = new DescriptionStepStore();
  private readonly flowNodeContinuity: FlowNodeContinuityFacade;
  private readonly flowNodeRolloverInFlight = new Set<string>();
  private readonly flowNodeRolloverStarted = new Set<string>();
  private readonly flowNodeTokenUsageSnapshots = new Map<
    string,
    TokenUsageSnapshot
  >();
  private readonly flowNodeContinuityLockContexts = new Map<
    string,
    FlowNodeContinuityLockContext
  >();
  private readonly flowNodeContinuityLockTimeouts = new Map<
    string,
    NodeJS.Timeout
  >();
  private flowNodeContinuitySettingsCache: {
    readonly mtimeMs: number;
    readonly settings: unknown;
  } | null = null;

  private emitFlowNodeRolloverNotification(
    sessionId: string,
    notification: Omit<FlowNodeRolloverNotification, "timestamp">
  ): void {
    this.broadcaster({
      type: "session:stream",
      payload: {
        sessionId,
        event: {
          ...notification,
          timestamp: new Date().toISOString(),
        } satisfies FlowNodeRolloverNotification,
      },
    });
  }

  private emitTurnStateEvent(options: {
    readonly sessionId: string;
    readonly state: "running" | "idle";
  }): void {
    const session = this.sessionManager.getSession(options.sessionId);
    const providerId = session?.providerId ?? null;

    this.broadcaster({
      type: "session:stream",
      payload: {
        sessionId: options.sessionId,
        event: {
          type: "stream_event",
          provider: providerId ?? "core",
          sessionId: options.sessionId,
          data: {
            kind: "turn_state",
            state: options.state,
            ...(providerId ? { providerId } : {}),
          },
          uuid: `${crypto.randomUUID()}::turn_state`,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  private emitContinuityLockEvent(options: {
    readonly sessionId: string;
    readonly rolloverId: string;
    readonly sourceSessionId: string;
    readonly targetSessionId?: string;
    readonly stageId: string;
    readonly runSlug: string | null;
    readonly state: ContinuityLockState;
    readonly reason: ContinuityLockReason;
  }): void {
    const session = this.sessionManager.getSession(options.sessionId);
    const providerId = session?.providerId ?? null;
    const timestamp = new Date().toISOString();
    const payload = {
      kind: "continuity_lock",
      state: options.state,
      rolloverId: options.rolloverId,
      sourceSessionId: options.sourceSessionId,
      ...(options.targetSessionId
        ? { targetSessionId: options.targetSessionId }
        : {}),
      stageId: options.stageId,
      runSlug: options.runSlug,
      reason: options.reason,
      timestamp,
    } satisfies ContinuityLockPayload;

    this.broadcaster({
      type: "session:stream",
      payload: {
        sessionId: options.sessionId,
        event: {
          type: "stream_event",
          provider: providerId ?? "core",
          sessionId: options.sessionId,
          data: payload,
          uuid: `${crypto.randomUUID()}::continuity_lock`,
          timestamp,
        },
      },
    });
  }

  private registerFlowNodeContinuityLockContext(
    context: FlowNodeContinuityLockContext
  ): FlowNodeContinuityLockContext {
    const previous = this.flowNodeContinuityLockContexts.get(
      context.sourceSessionId
    );
    if (
      previous?.targetSessionId &&
      previous.targetSessionId !== context.targetSessionId
    ) {
      this.flowNodeContinuityLockContexts.delete(previous.targetSessionId);
    }
    this.flowNodeContinuityLockContexts.set(context.sourceSessionId, context);
    if (context.targetSessionId) {
      this.flowNodeContinuityLockContexts.set(context.targetSessionId, context);
    }
    return context;
  }

  private clearFlowNodeContinuityLockTimeout(rolloverId: string): void {
    const timeout = this.flowNodeContinuityLockTimeouts.get(rolloverId);
    if (!timeout) {
      return;
    }
    clearTimeout(timeout);
    this.flowNodeContinuityLockTimeouts.delete(rolloverId);
  }

  private scheduleFlowNodeContinuityLockTimeout(
    context: FlowNodeContinuityLockContext
  ): void {
    const targetSessionId = context.targetSessionId;
    if (!(targetSessionId && context.awaitingBootstrapTurn)) {
      return;
    }
    this.clearFlowNodeContinuityLockTimeout(context.rolloverId);
    const timeout = setTimeout(() => {
      this.logger.warn("Flow node continuity lock timeout reached", {
        rolloverId: context.rolloverId,
        sourceSessionId: context.sourceSessionId,
        targetSessionId,
        stageId: context.stageId,
        runSlug: context.runSlug,
        timeoutMs: FLOW_NODE_CONTINUITY_RESUME_TIMEOUT_MS,
      });
      this.finalizeFlowNodeContinuityLock({
        sessionId: targetSessionId,
        reason: "resume_timeout",
      });
    }, FLOW_NODE_CONTINUITY_RESUME_TIMEOUT_MS);
    this.flowNodeContinuityLockTimeouts.set(context.rolloverId, timeout);
  }

  private finalizeFlowNodeContinuityLock(options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }): void {
    const context = this.flowNodeContinuityLockContexts.get(options.sessionId);
    if (!context) {
      return;
    }
    const targetSessionId = context.targetSessionId ?? context.sourceSessionId;
    const payloadBase = {
      rolloverId: context.rolloverId,
      sourceSessionId: context.sourceSessionId,
      ...(context.targetSessionId
        ? { targetSessionId: context.targetSessionId }
        : {}),
      stageId: context.stageId,
      runSlug: context.runSlug,
      state: "unlocked" as const,
      reason: options.reason,
    };
    this.emitContinuityLockEvent({
      sessionId: targetSessionId,
      ...payloadBase,
    });
    if (context.sourceSessionId !== targetSessionId) {
      this.emitContinuityLockEvent({
        sessionId: context.sourceSessionId,
        ...payloadBase,
      });
    }
    this.clearFlowNodeContinuityLockTimeout(context.rolloverId);
    this.flowNodeContinuityLockContexts.delete(context.sourceSessionId);
    if (context.targetSessionId) {
      this.flowNodeContinuityLockContexts.delete(context.targetSessionId);
    }
  }

  private finalizeFlowNodeContinuityLockOnBootstrapTurn(options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed"
    >;
  }): void {
    const context = this.flowNodeContinuityLockContexts.get(options.sessionId);
    if (
      !(
        context &&
        context.targetSessionId === options.sessionId &&
        context.awaitingBootstrapTurn
      )
    ) {
      return;
    }
    this.finalizeFlowNodeContinuityLock({
      sessionId: options.sessionId,
      reason: options.reason,
    });
  }

  constructor(options: SessionRequestHandlerOptions) {
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.providerRegistry = options.providerRegistry;
    this.sessionStorage = options.sessionStorage;
    this.logger = options.logger;
    this.questionnaireCurator = new QuestionnaireCuratorFacade({
      config: options.config,
      logger: options.logger,
    });
    this.broadcaster = options.broadcaster;
    this.stateBroadcaster = options.stateBroadcaster;
    this.continuity = new SessionContinuityFacade({
      logger: this.logger,
      clock: options.continuityClock,
      remainingRatioThreshold: Math.min(
        1,
        Math.max(0, this.config.claudeContinuityRemainingPercentThreshold / 100)
      ),
      enableLegacyHandoff: false,
      callbacks: {
        sendMessage: async (sessionId, content) =>
          this.sendInternalMessage(sessionId, content),
        createSession: async (request) => this.createContinuitySession(request),
      },
      sessionLookup: (sessionId) => this.sessionManager.getSession(sessionId),
    });
    this.flowNodeContinuity = new FlowNodeContinuityFacade({
      templatesDir: this.config.templatesDir,
      preemptRemainingPercentThreshold:
        this.config.continuityPreemptRemainingPercentThreshold,
    });
  }

  private resolveRunBoundProviderContext(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly initiativeSlug: string | null;
    readonly runSlug: string | null;
    readonly requestedProviderSessionId: string | null;
  }): {
    readonly providerId: string;
    readonly providerSessionId: string | null;
  } {
    return {
      providerId: options.providerId,
      providerSessionId: options.requestedProviderSessionId,
    };
  }

  private buildSessionFilePathForValidation(
    workspaceKey: string,
    providerId: string,
    providerSessionId: string
  ): string {
    return buildSessionFilePath({
      rootDirectory: SESSION_ROOT,
      workspaceSlug: sanitizeWorkspaceSlug(workspaceKey),
      provider: providerId,
      sessionId: sanitizeWorkspaceSlug(providerSessionId),
    });
  }

  private async validateProviderSessionExists(
    workspacePath: string,
    providerId: string,
    providerSessionId: string
  ): Promise<
    { readonly valid: true } | { readonly valid: false; readonly error: string }
  > {
    const preferredWorkspaceKey =
      sanitizeWorkspaceSlug(workspacePath) || "default-workspace";
    const workspaceKeys = await listUnifiedSessionWorkspaceSlugs({
      rootDirectory: SESSION_ROOT,
      logger: this.logger,
    });
    const candidates = new Set<string>([
      preferredWorkspaceKey,
      ...workspaceKeys,
    ]);

    for (const workspaceKey of candidates) {
      const filePath = this.buildSessionFilePathForValidation(
        workspaceKey,
        providerId,
        providerSessionId
      );
      try {
        await access(filePath);
        return { valid: true };
      } catch {
        // continue
      }
    }

    return {
      valid: false,
      error: `Provider session ${providerSessionId} does not exist for workspace ${workspacePath}`,
    };
  }

  private async resolveProviderSessionId(options: {
    readonly adapter: ProviderAdapter;
    readonly providerId: string;
    readonly workspacePath: string;
    readonly requestedProviderSessionId: string | null;
  }): Promise<ProviderSessionResolution> {
    const { adapter, providerId, workspacePath, requestedProviderSessionId } =
      options;
    const shouldResume =
      typeof requestedProviderSessionId === "string" &&
      requestedProviderSessionId.trim().length > 0;

    if (shouldResume) {
      if (!adapter.resumeSession) {
        return {
          error: `Provider ${providerId} does not support resume`,
        };
      }

      const trimmedSessionId = requestedProviderSessionId.trim();

      // Workspace validation: ensure providerSessionId belongs to current workspace
      const validation = await this.validateProviderSessionExists(
        workspacePath,
        providerId,
        trimmedSessionId
      );

      if (!validation.valid) {
        return { error: validation.error };
      }

      const providerSessionId = await adapter.resumeSession(
        trimmedSessionId,
        workspacePath
      );

      return {
        providerSessionId,
        didResume: true,
        supportsImmediateBinding: true,
      };
    }

    const providerSessionId = await adapter.createSession(workspacePath);
    return {
      providerSessionId,
      didResume: false,
      supportsImmediateBinding:
        providerId === "geminiCli" && providerSessionId.length > 0,
    };
  }

  private async createAndRegisterSession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly adapter: ProviderAdapter;
    readonly context: {
      readonly initiativeSlug: string | null;
      readonly stage: string | null;
      readonly runSlug: string | null;
      readonly providerSessionId: string | null;
    };
    readonly rootSessionId?: string | null;
    readonly continuationParentId?: string | null;
  }): Promise<Session | null> {
    const providerSessionResolution = await this.resolveProviderSessionId({
      adapter: options.adapter,
      providerId: options.providerId,
      workspacePath: options.workspacePath,
      requestedProviderSessionId: options.context.providerSessionId,
    });
    if ("error" in providerSessionResolution) {
      this.broadcaster({
        type: "session:error",
        payload: { message: providerSessionResolution.error },
      });
      return null;
    }

    const { providerSessionId, supportsImmediateBinding } =
      providerSessionResolution;

    const session = this.sessionManager.createSession(
      options.providerId,
      options.workspacePath,
      supportsImmediateBinding ? providerSessionId : undefined,
      {
        initiativeSlug: options.context.initiativeSlug,
        stage: options.context.stage,
        runSlug: options.context.runSlug ?? null,
        continuationParentId: options.continuationParentId ?? null,
      }
    );
    if (!supportsImmediateBinding) {
      this.sessionManager.seedProviderSessionId(session.id, providerSessionId);
    }

    this.sessionStorage.register(session);
    this.updateDescriptionSessionRef(session, providerSessionId);

    const unsubscribe = options.adapter.subscribe(
      providerSessionId,
      (event: unknown) => {
        this.handleProviderEvent(session.id, event);
      }
    );

    this.providerSessions.set(session.id, {
      providerId: options.providerId,
      providerSessionId,
      unsubscribe,
    });

    if (supportsImmediateBinding) {
      this.updateProviderBinding(session.id, providerSessionId);
    }

    this.continuity.registerSession({
      session,
      providerSessionId,
      rootSessionId: options.rootSessionId ?? null,
    });

    this.broadcaster({
      type: "session:created",
      payload: serializeSession(session),
    });
    this.broadcastSessionBinding(session.id);

    return session;
  }

  private async createContinuitySession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly context: {
      readonly initiativeSlug: string | null;
      readonly stage: string | null;
    };
    readonly rootSessionId: string;
  }): Promise<Session | null> {
    const adapter = this.providerRegistry.getAdapter(options.providerId);
    if (!adapter) {
      this.logger.warn("Continuity session creation failed: provider missing", {
        providerId: options.providerId,
      });
      return null;
    }

    try {
      return await this.createAndRegisterSession({
        providerId: options.providerId,
        workspacePath: options.workspacePath,
        adapter,
        context: {
          initiativeSlug: options.context.initiativeSlug,
          stage: options.context.stage,
          runSlug: null,
          providerSessionId: null,
        },
        rootSessionId: options.rootSessionId,
      });
    } catch (error) {
      this.handleProviderFailure(options.providerId, error);
      return null;
    }
  }

  private async sendInternalMessage(
    sessionId: string,
    content: string
  ): Promise<void> {
    const binding = this.providerSessions.get(sessionId);
    const adapter = binding
      ? this.providerRegistry.getAdapter(binding.providerId)
      : null;

    if (!(binding && adapter)) {
      this.logMissingProviderBindingForIncomingMessage(
        sessionId,
        binding?.providerId,
        Boolean(binding),
        Boolean(adapter)
      );
      return;
    }

    await this.continuity.ensureTrackedOnOutboundMessage({
      sessionId,
      providerSessionId: binding.providerSessionId,
    });

    this.logDispatchingMessageToProvider(sessionId, binding, content.length);

    try {
      await adapter.sendMessage(binding.providerSessionId, content);
    } catch (error) {
      this.logProviderSendMessageFailed(sessionId, binding, error);
      this.handleProviderFailure(binding.providerId, error, sessionId);
    }
  }

  private normalizeProviderId(value?: string): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private resolveWorkspacePath(workspacePath?: string): string {
    const trimmed =
      typeof workspacePath === "string" && workspacePath.trim().length > 0
        ? workspacePath.trim()
        : undefined;
    const cwdPath = process.cwd();
    const environmentWorkspacePath = this.config.claudeWorkspacePath;

    if (
      environmentWorkspacePath &&
      (!trimmed || path.resolve(trimmed) === path.resolve(cwdPath))
    ) {
      return environmentWorkspacePath;
    }

    return trimmed ?? environmentWorkspacePath ?? cwdPath;
  }

  private normalizeNullableToken(
    value: string | null | undefined
  ): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private sessionMatchesResume(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly initiativeSlug: string | null;
    readonly stage: string | null;
    readonly providerSessionId: string;
    readonly session: Session;
  }): boolean {
    const session = options.session;
    if (session.providerId !== options.providerId) {
      return false;
    }
    if (session.workspacePath !== options.workspacePath) {
      return false;
    }
    if (options.stage !== null && session.stage !== options.stage) {
      return false;
    }
    if (
      options.initiativeSlug !== null &&
      session.initiativeSlug !== options.initiativeSlug
    ) {
      return false;
    }
    return session.providerSessionId === options.providerSessionId;
  }

  private resolveExistingResumeSession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly initiativeSlug: string | null;
    readonly stage: string | null;
    readonly providerSessionId: string;
  }): Session | null {
    const stage = this.normalizeNullableToken(options.stage);
    const initiativeSlug = this.normalizeNullableToken(options.initiativeSlug);
    const providerSessionId = options.providerSessionId.trim();

    for (const session of this.sessionManager.listSessions()) {
      if (
        this.sessionMatchesResume({
          session,
          providerId: options.providerId,
          workspacePath: options.workspacePath,
          stage,
          initiativeSlug,
          providerSessionId,
        })
      ) {
        return session;
      }
    }
    return null;
  }

  private broadcastExistingSession(session: Session): void {
    this.broadcaster({
      type: "session:created",
      payload: serializeSession(session),
    });
    this.broadcastSessionBinding(session.id);
  }

  private tryReuseExistingResumeSession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly providerSessionId: string | null;
    readonly context?: {
      readonly initiativeSlug?: string | null;
      readonly stage?: string | null;
    };
  }): boolean {
    const providerSessionId = this.normalizeNullableToken(
      options.providerSessionId
    );
    if (!providerSessionId) {
      return false;
    }
    const existing = this.resolveExistingResumeSession({
      providerId: options.providerId,
      workspacePath: options.workspacePath,
      initiativeSlug: options.context?.initiativeSlug ?? null,
      stage: options.context?.stage ?? null,
      providerSessionId,
    });
    if (!existing) {
      return false;
    }
    this.broadcastExistingSession(existing);
    return true;
  }

  async handleCreate(
    providerId?: string,
    workspacePath?: string,
    context?: {
      readonly initiativeSlug?: string | null;
      readonly stage?: string | null;
      readonly runSlug?: string | null;
      readonly providerSessionId?: string | null;
    }
  ): Promise<void> {
    const normalizedRequestedProviderId = this.normalizeProviderId(providerId);
    const requestedProviderId =
      normalizedRequestedProviderId ?? this.getDefaultProviderId();
    const actualWorkspacePath = this.resolveWorkspacePath(workspacePath);

    const runBound = this.resolveRunBoundProviderContext({
      providerId: requestedProviderId,
      workspacePath: actualWorkspacePath,
      initiativeSlug: context?.initiativeSlug ?? null,
      runSlug: context?.runSlug ?? null,
      requestedProviderSessionId: context?.providerSessionId ?? null,
    });
    const actualProviderId = runBound.providerId;
    if (
      this.tryReuseExistingResumeSession({
        providerId: actualProviderId,
        workspacePath: actualWorkspacePath,
        providerSessionId: runBound.providerSessionId,
        context,
      })
    ) {
      return;
    }
    const adapter = this.providerRegistry.getAdapter(actualProviderId);

    if (!adapter) {
      this.broadcaster({
        type: "session:error",
        payload: { message: `Provider ${actualProviderId} unavailable` },
      });
      return;
    }

    try {
      await this.createAndRegisterSession({
        providerId: actualProviderId,
        workspacePath: actualWorkspacePath,
        adapter,
        context: {
          initiativeSlug: context?.initiativeSlug ?? null,
          stage: context?.stage ?? null,
          runSlug: context?.runSlug ?? null,
          providerSessionId: runBound.providerSessionId,
        },
      });
    } catch (error) {
      this.handleProviderFailure(actualProviderId, error);
    }
  }

  async createSessionForWorkflow(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly context: {
      readonly initiativeSlug: string;
      readonly stage: string;
      readonly runSlug?: string | null;
    };
  }): Promise<Session | null> {
    const adapter = this.providerRegistry.getAdapter(options.providerId);
    if (!adapter) {
      this.logger.warn("Workflow session creation failed: provider missing", {
        providerId: options.providerId,
      });
      return null;
    }

    try {
      return await this.createAndRegisterSession({
        providerId: options.providerId,
        workspacePath: options.workspacePath,
        adapter,
        context: {
          initiativeSlug: options.context.initiativeSlug,
          stage: options.context.stage,
          runSlug: options.context.runSlug ?? null,
          providerSessionId: null,
        },
      });
    } catch (error) {
      this.handleProviderFailure(options.providerId, error);
      return null;
    }
  }

  async handleMessage(
    sessionId: string,
    messagePayload: MessageContentPayload
  ): Promise<void> {
    this.logSessionMessageReceived(sessionId, messagePayload);
    const extracted = this.extractMessageContentAndTurnOptions(messagePayload);
    if (!extracted) {
      this.logger.warn("Received invalid message payload", { sessionId });
      return;
    }

    const { content, turnOptions } = extracted;
    this.logSessionMessageExtracted(sessionId, content, turnOptions);
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      this.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      this.logSessionNotFoundForIncomingMessage(sessionId);
      return;
    }

    this.logResolvedSessionForIncomingMessage(sessionId, session);

    const userMessage = this.sessionManager.appendMessage(
      sessionId,
      "user",
      content
    );
    if (!userMessage) {
      this.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      return;
    }

    this.sessionStorage.appendMessage(sessionId, userMessage);
    this.broadcaster({ type: "session:message", payload: userMessage });

    const binding = this.providerSessions.get(sessionId);
    const adapter = binding
      ? this.providerRegistry.getAdapter(binding.providerId)
      : null;

    if (!(binding && adapter)) {
      this.logMissingProviderBindingForIncomingMessage(
        sessionId,
        binding?.providerId,
        Boolean(binding),
        Boolean(adapter)
      );
      return;
    }

    await this.continuity.ensureTrackedOnOutboundMessage({
      sessionId,
      providerSessionId: binding.providerSessionId,
    });

    this.logDispatchingMessageToProvider(sessionId, binding, content.length);

    try {
      const workflowTurnOptions = await resolveWorkflowTurnOptions({
        stage: session.stage,
        content,
        turnOptions,
      });
      const providerTurnOptions = workflowTurnOptions.stageMatched
        ? workflowTurnOptions.turnOptions
        : turnOptions;
      if (workflowTurnOptions.appliedSchema) {
        this.logger.info("Applied workflow output schema", {
          sessionId,
          stage: session.stage,
          finalize: workflowTurnOptions.finalize,
          source: workflowTurnOptions.source,
        });
      }
      await adapter.sendMessage(
        binding.providerSessionId,
        content,
        providerTurnOptions
      );

      if (workflowTurnOptions.finalize) {
        this.questionnaireCurator
          .maybeCurate(session, adapter)
          .catch((error: unknown) => {
            this.logger.warn("Questionnaire curator failed", {
              sessionId,
              providerId: binding.providerId,
              error: error instanceof Error ? error.message : String(error),
            });
          });
      }
    } catch (error) {
      this.logProviderSendMessageFailed(sessionId, binding, error);
      this.handleProviderFailure(binding.providerId, error, sessionId);
    }
  }

  async handleDelete(sessionId: string): Promise<void> {
    const binding = this.providerSessions.get(sessionId);
    if (binding) {
      const adapter = this.providerRegistry.getAdapter(binding.providerId);
      binding.unsubscribe();
      this.providerSessions.delete(sessionId);
      try {
        await adapter?.closeSession(binding.providerSessionId);
      } catch (error) {
        this.handleProviderFailure(binding.providerId, error, sessionId);
      }
    }

    const deleted = this.sessionManager.deleteSession(sessionId);
    if (!deleted) {
      this.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      return;
    }

    this.sessionStorage.close(sessionId, "session-deleted");
    this.broadcaster({ type: "session:deleted", payload: { sessionId } });
  }

  private handleProviderEvent(sessionId: string, event: unknown): void {
    this.continuity.handleProviderEvent(sessionId, event).catch((error) => {
      this.logger.warn("Session continuity handler failed", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    this.handleFlowNodeContinuityProviderEvent(sessionId, event).catch(
      (error) => {
        this.logger.warn("Flow node continuity handler failed", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    );

    if (typeof event === "string") {
      this.updateBindingWithResolvedId(sessionId, event);
      return;
    }
    if (!event || typeof event !== "object") {
      return;
    }
    this.handleTypedProviderEvent(sessionId, event as ProviderEventEnvelope);
  }

  private async handleFlowNodeContinuityProviderEvent(
    sessionId: string,
    event: unknown
  ): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }

    if (this.flowNodeRolloverStarted.has(sessionId)) {
      return;
    }

    const usage = extractTokenUsage(event);
    if (!usage) {
      return;
    }
    this.flowNodeTokenUsageSnapshots.set(sessionId, usage);

    if (!(session.initiativeSlug && session.stage)) {
      return;
    }

    const remainingPercentThreshold =
      await this.resolveLiveContinuityRemainingPercentThreshold(session);
    if (!isBelowRemainingPercentThreshold(usage, remainingPercentThreshold)) {
      return;
    }

    if (
      !this.flowNodeContinuity.isEligibleForRollover({
        stageId: session.stage,
        runSlug: session.runSlug,
      })
    ) {
      return;
    }

    if (this.flowNodeRolloverInFlight.has(sessionId)) {
      return;
    }

    this.flowNodeRolloverInFlight.add(sessionId);
    this.flowNodeRolloverStarted.add(sessionId);
    const remainingPercent = computeRemainingPercent(usage);
    const continuityLockContext = this.registerFlowNodeContinuityLockContext({
      rolloverId: crypto.randomUUID(),
      sourceSessionId: sessionId,
      stageId: session.stage,
      runSlug: session.runSlug ?? null,
      awaitingBootstrapTurn: false,
    });
    this.emitContinuityLockEvent({
      sessionId,
      rolloverId: continuityLockContext.rolloverId,
      sourceSessionId: continuityLockContext.sourceSessionId,
      stageId: continuityLockContext.stageId,
      runSlug: continuityLockContext.runSlug,
      state: "locked",
      reason: "threshold_reached",
    });
    this.emitFlowNodeRolloverNotification(sessionId, {
      kind: "flow_node_rollover",
      phase: "start",
      sourceSessionId: sessionId,
      providerId: session.providerId,
      stageId: session.stage,
      runSlug: session.runSlug ?? null,
      remainingPercent,
      thresholdPercent: remainingPercentThreshold,
    });
    try {
      await this.rolloverFlowNodeSession(
        session,
        {
          remainingPercent,
          thresholdPercent: remainingPercentThreshold,
          rolloverId: continuityLockContext.rolloverId,
        },
        { silent: false }
      );
    } catch (error) {
      this.finalizeFlowNodeContinuityLock({
        sessionId,
        reason: "resume_failed",
      });
      this.flowNodeRolloverStarted.delete(sessionId);
      this.emitFlowNodeRolloverNotification(sessionId, {
        kind: "flow_node_rollover",
        phase: "failed",
        sourceSessionId: sessionId,
        providerId: session.providerId,
        stageId: session.stage,
        runSlug: session.runSlug ?? null,
        remainingPercent,
        thresholdPercent: remainingPercentThreshold,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      this.flowNodeRolloverInFlight.delete(sessionId);
    }
  }

  private async handleFlowNodeContinuitySilentPreemptiveRollover(
    sessionId: string
  ): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }

    if (!(session.initiativeSlug && session.stage)) {
      return;
    }

    if (this.flowNodeRolloverStarted.has(sessionId)) {
      return;
    }

    if (this.flowNodeRolloverInFlight.has(sessionId)) {
      return;
    }

    const usage = this.flowNodeTokenUsageSnapshots.get(sessionId);
    if (!usage) {
      return;
    }

    const remainingPercent = computeRemainingPercent(usage);
    if (
      !this.flowNodeContinuity.shouldStartSilentPreemptiveRollover({
        stageId: session.stage,
        runSlug: session.runSlug ?? null,
        remainingPercent,
      })
    ) {
      return;
    }

    this.flowNodeRolloverInFlight.add(sessionId);
    this.flowNodeRolloverStarted.add(sessionId);
    const continuityLockContext = this.registerFlowNodeContinuityLockContext({
      rolloverId: crypto.randomUUID(),
      sourceSessionId: sessionId,
      stageId: session.stage,
      runSlug: session.runSlug ?? null,
      awaitingBootstrapTurn: false,
    });
    this.emitContinuityLockEvent({
      sessionId,
      rolloverId: continuityLockContext.rolloverId,
      sourceSessionId: continuityLockContext.sourceSessionId,
      stageId: continuityLockContext.stageId,
      runSlug: continuityLockContext.runSlug,
      state: "locked",
      reason: "threshold_reached",
    });
    try {
      await this.rolloverFlowNodeSession(
        session,
        {
          remainingPercent,
          thresholdPercent:
            this.config.continuityPreemptRemainingPercentThreshold,
          rolloverId: continuityLockContext.rolloverId,
        },
        { silent: true }
      );
    } catch (error) {
      this.finalizeFlowNodeContinuityLock({
        sessionId,
        reason: "resume_failed",
      });
      this.flowNodeRolloverStarted.delete(sessionId);
      throw error;
    } finally {
      this.flowNodeRolloverInFlight.delete(sessionId);
    }
  }

  private toSafeTimestamp(value: string): string {
    return (
      value
        .trim()
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/-$/g, "") || "unknown"
    );
  }

  private resolveSettingsProviderKey(providerId: string): "claude" | "codex" {
    return providerId.startsWith("codex") ? "codex" : "claude";
  }

  private async loadContinuitySettingsSnapshot(): Promise<unknown> {
    const settingsPath = this.config.claudeSettingsPath;
    try {
      const fileStat = await stat(settingsPath);
      const mtimeMs = fileStat.mtimeMs;
      if (
        this.flowNodeContinuitySettingsCache &&
        this.flowNodeContinuitySettingsCache.mtimeMs === mtimeMs
      ) {
        return this.flowNodeContinuitySettingsCache.settings;
      }

      const raw = await readFile(settingsPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      this.flowNodeContinuitySettingsCache = { mtimeMs, settings: parsed };
      return parsed;
    } catch {
      return null;
    }
  }

  private async resolveLiveContinuityRemainingPercentThreshold(
    session: Session
  ): Promise<number> {
    const providerKey = this.resolveSettingsProviderKey(session.providerId);
    const settings = await this.loadContinuitySettingsSnapshot();
    return extractContinuityThresholdPercentFromSettings({
      settings,
      providerKey,
      fallback:
        this.config.claudeContinuityRemainingPercentThreshold ??
        DEFAULT_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    });
  }

  private resolveDescriptionReviewerFinalArtifactPath(
    session: Session
  ): string {
    const relativePath = path.join(
      ".codeai-hub",
      session.initiativeSlug ?? "default-workspace",
      "description",
      "Final_Description.md"
    );
    return path.resolve(session.workspacePath, relativePath);
  }

  private resolveFlowNodeId(stageId: string, runSlug: string | null): string {
    return runSlug ? `${stageId}/${runSlug}` : stageId;
  }

  private resolveFlowNodeRole(runSlug: string | null): string {
    if (!runSlug) {
      return "Agent";
    }
    return `${runSlug.slice(0, 1).toUpperCase()}${runSlug.slice(1)}`;
  }

  private resolveFlowNodeContinuityTemplate(options: {
    readonly session: Session;
    readonly stageId: string;
  }): {
    readonly templateId:
      | "flow/continuity/create-report-doc.md"
      | "flow/continuity/create-report-code.md";
    readonly canonicalArtifactPath: string;
    readonly isReviewerBootstrapEligible: boolean;
  } {
    const isReviewerBootstrapEligible =
      options.stageId === "description" &&
      options.session.runSlug === "reviewer";

    if (isReviewerBootstrapEligible) {
      return {
        templateId: "flow/continuity/create-report-doc.md",
        canonicalArtifactPath: this.resolveDescriptionReviewerFinalArtifactPath(
          options.session
        ),
        isReviewerBootstrapEligible,
      };
    }

    return {
      templateId: "flow/continuity/create-report-code.md",
      canonicalArtifactPath: "",
      isReviewerBootstrapEligible,
    };
  }

  private buildReviewerBootstrapPrompt(session: Session): string {
    return [
      "You are a Reviewer Agent for the Description step.",
      "Convert draft description.md to Final_Description.md.",
      `Final target: \`${this.resolveDescriptionReviewerFinalArtifactPath(
        session
      )}\``,
    ].join("\n");
  }

  private async rolloverFlowNodeSession(
    session: Session,
    rollover: {
      readonly remainingPercent: number;
      readonly thresholdPercent: number;
      readonly rolloverId: string;
    },
    options?: { readonly silent: boolean }
  ): Promise<void> {
    const adapter = this.providerRegistry.getAdapter(session.providerId);
    if (!adapter) {
      this.finalizeFlowNodeContinuityLock({
        sessionId: session.id,
        reason: "resume_failed",
      });
      return;
    }

    const workspaceSlug = session.initiativeSlug;
    const stageId = session.stage;
    if (!(workspaceSlug && stageId)) {
      this.finalizeFlowNodeContinuityLock({
        sessionId: session.id,
        reason: "resume_failed",
      });
      return;
    }

    const runSlug = session.runSlug ?? null;
    const nodeId = this.resolveFlowNodeId(stageId, runSlug);
    const role = this.resolveFlowNodeRole(runSlug);
    const timestamp = this.toSafeTimestamp(new Date().toISOString());

    const reportPaths = this.flowNodeContinuity.buildReportPaths({
      workspaceRoot: session.workspacePath,
      workspaceSlug,
      nodeId,
      role,
      providerId: session.providerId,
      timestamp,
    });

    const notificationBase = {
      kind: "flow_node_rollover",
      sourceSessionId: session.id,
      providerId: session.providerId,
      stageId,
      runSlug,
      remainingPercent: rollover.remainingPercent,
      thresholdPercent: rollover.thresholdPercent,
    } as const;

    const sourceLockContext = this.registerFlowNodeContinuityLockContext({
      rolloverId: rollover.rolloverId,
      sourceSessionId: session.id,
      stageId,
      runSlug,
      awaitingBootstrapTurn: false,
    });
    this.emitContinuityLockEvent({
      sessionId: session.id,
      rolloverId: sourceLockContext.rolloverId,
      sourceSessionId: sourceLockContext.sourceSessionId,
      stageId: sourceLockContext.stageId,
      runSlug: sourceLockContext.runSlug,
      state: "locked",
      reason: "report_in_progress",
    });

    if (!options?.silent) {
      this.emitFlowNodeRolloverNotification(session.id, {
        ...notificationBase,
        phase: "create_report_sent",
        reportPath: reportPaths.reportPath,
        tmpReportPath: reportPaths.tmpReportPath,
      });
    }

    const { canonicalArtifactPath, templateId, isReviewerBootstrapEligible } =
      this.resolveFlowNodeContinuityTemplate({ session, stageId });

    const createReportPrompt = this.flowNodeContinuity.renderTemplate(
      templateId,
      {
        nodeId,
        role,
        reportPath: reportPaths.reportPath,
        canonicalArtifactPath,
      }
    );

    const wrappedCreateReportPrompt = [
      "INTERNAL: Context budget is low. Prepare continuity report and save it on disk.",
      `- Temp path: \`${reportPaths.tmpReportPath}\``,
      `- Final path: \`${reportPaths.reportPath}\``,
      "",
      createReportPrompt.trim(),
    ].join("\n");

    await this.sendInternalMessage(session.id, wrappedCreateReportPrompt);

    if (!options?.silent) {
      this.emitFlowNodeRolloverNotification(session.id, {
        ...notificationBase,
        phase: "waiting_for_report",
        reportPath: reportPaths.reportPath,
        tmpReportPath: reportPaths.tmpReportPath,
      });
    }

    await this.flowNodeContinuity.waitForReport({
      reportPath: reportPaths.reportPath,
      timeoutMs: 60_000,
      pollIntervalMs: 250,
    });

    if (!options?.silent) {
      this.emitFlowNodeRolloverNotification(session.id, {
        ...notificationBase,
        phase: "report_ready",
        reportPath: reportPaths.reportPath,
      });
    }

    const nextSession = await this.createAndRegisterSession({
      providerId: session.providerId,
      workspacePath: session.workspacePath,
      adapter,
      context: {
        initiativeSlug: workspaceSlug,
        stage: stageId,
        runSlug: session.runSlug,
        providerSessionId: null,
      },
      rootSessionId: session.id,
      continuationParentId: session.id,
    });

    if (!nextSession) {
      this.finalizeFlowNodeContinuityLock({
        sessionId: session.id,
        reason: "resume_failed",
      });
      return;
    }

    const targetLockContext = this.registerFlowNodeContinuityLockContext({
      rolloverId: rollover.rolloverId,
      sourceSessionId: session.id,
      targetSessionId: nextSession.id,
      stageId,
      runSlug,
      awaitingBootstrapTurn: true,
    });

    if (!options?.silent) {
      this.emitFlowNodeRolloverNotification(session.id, {
        ...notificationBase,
        phase: "new_session_created",
        nextSessionId: nextSession.id,
      });
    }

    this.emitContinuityLockEvent({
      sessionId: nextSession.id,
      rolloverId: targetLockContext.rolloverId,
      sourceSessionId: targetLockContext.sourceSessionId,
      targetSessionId: targetLockContext.targetSessionId,
      stageId: targetLockContext.stageId,
      runSlug: targetLockContext.runSlug,
      state: "locked",
      reason: "resume_bootstrap",
    });

    const resumePrompt = this.flowNodeContinuity.renderTemplate(
      "flow/continuity/resume.md",
      {
        nodeId,
        role,
        reportPath: reportPaths.reportPath,
      }
    );

    const resumePromptTrimmed = resumePrompt.trim();
    let wrappedResumePrompt = resumePromptTrimmed;
    if (isReviewerBootstrapEligible) {
      wrappedResumePrompt = [
        this.buildReviewerBootstrapPrompt(session),
        "",
        resumePromptTrimmed,
      ].join("\n");
    }

    await this.sendInternalMessage(nextSession.id, wrappedResumePrompt);
    this.scheduleFlowNodeContinuityLockTimeout(targetLockContext);

    if (!options?.silent) {
      this.emitFlowNodeRolloverNotification(nextSession.id, {
        ...notificationBase,
        phase: "resume_sent",
        nextSessionId: nextSession.id,
        reportPath: reportPaths.reportPath,
      });
    }
  }

  private handleTypedProviderEvent(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    switch (event.type) {
      case "sessionIdChanged":
        this.handleSessionIdChangedEvent(sessionId, event.payload);
        break;
      case "realSessionId":
        this.handleRealSessionIdEvent(sessionId, event.payload);
        break;
      case "turn_started":
        this.emitTurnStateEvent({ sessionId, state: "running" });
        break;
      case "turn_completed":
        this.emitTurnStateEvent({ sessionId, state: "idle" });
        this.finalizeFlowNodeContinuityLockOnBootstrapTurn({
          sessionId,
          reason: "resume_ready",
        });
        this.handleFlowNodeContinuitySilentPreemptiveRollover(sessionId).catch(
          (error) => {
            this.logger.warn("Silent preemptive rollover failed", {
              sessionId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        );
        break;
      case "turn_failed":
        this.emitTurnStateEvent({ sessionId, state: "idle" });
        this.finalizeFlowNodeContinuityLockOnBootstrapTurn({
          sessionId,
          reason: "resume_failed",
        });
        this.broadcastProviderError(sessionId, event);
        break;
      case "stream_error":
      case "error":
        this.finalizeFlowNodeContinuityLockOnBootstrapTurn({
          sessionId,
          reason: "resume_failed",
        });
        this.broadcastProviderError(sessionId, event);
        break;
      case "stream_event":
        this.broadcaster({
          type: "session:stream",
          payload: { sessionId, event },
        });
        break;
      case "assistant":
        this.appendProviderMessage(sessionId, "assistant", event);
        break;
      case "thinking":
        this.appendProviderMessage(sessionId, "thinking", event);
        break;
      case "dialog_message":
        this.appendDialogMessage(sessionId, event as DialogMessagePayload);
        break;
      default:
        break;
    }
  }

  private broadcastProviderError(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    const typed = event as ProviderErrorEnvelope;
    const providerId =
      typeof typed.provider === "string" && typed.provider.trim().length > 0
        ? typed.provider.trim()
        : null;

    const message = this.extractProviderErrorMessage(typed);
    this.broadcaster({
      type: "session:error",
      payload: {
        sessionId,
        providerId,
        message,
      },
    });
  }

  private extractProviderErrorMessage(event: ProviderErrorEnvelope): string {
    if (typeof event.message === "string" && event.message.trim().length > 0) {
      return event.message.trim();
    }
    if (typeof event.error === "string" && event.error.trim().length > 0) {
      return event.error.trim();
    }
    if (event.error && typeof event.error === "object") {
      const candidate = event.error as { readonly message?: unknown };
      if (
        typeof candidate.message === "string" &&
        candidate.message.trim().length > 0
      ) {
        return candidate.message.trim();
      }
      return JSON.stringify(event.error);
    }
    if (event.payload && typeof event.payload === "object") {
      const candidate = event.payload as { readonly message?: unknown };
      if (
        typeof candidate.message === "string" &&
        candidate.message.trim().length > 0
      ) {
        return candidate.message.trim();
      }
      return JSON.stringify(event.payload);
    }
    return "Provider error.";
  }

  private handleProviderFailure(
    providerId: string,
    error: unknown,
    sessionId?: string
  ): void {
    this.logger.error(
      "Provider operation failed",
      error instanceof Error ? error : new Error(String(error)),
      { providerId }
    );
    this.providerRegistry.handleRuntimeFailure(providerId, error);

    if (sessionId) {
      const binding = this.providerSessions.get(sessionId);
      if (binding) {
        binding.unsubscribe();
        this.providerSessions.delete(sessionId);
      }
      this.sessionManager.markProviderSessionFailed(sessionId);
      this.sessionStorage.close(sessionId, "provider-failure");
      this.broadcastSessionBinding(sessionId);
    }

    this.broadcaster({
      type: "session:error",
      payload: {
        sessionId: sessionId ?? null,
        providerId,
        message:
          error instanceof Error ? error.message : "Provider unavailable",
      },
    });

    if (!sessionId) {
      this.stateBroadcaster();
    }
  }

  private appendProviderMessage(
    sessionId: string,
    role: "assistant" | "system" | "thinking",
    event: unknown
  ): void {
    const content = this.extractMessageContent(event);
    if (!content) {
      return;
    }
    const message = this.sessionManager.appendMessage(sessionId, role, content);
    if (message) {
      this.sessionStorage.appendMessage(sessionId, message);
      this.broadcaster({ type: "session:message", payload: message });
    }
  }

  private appendDialogMessage(
    sessionId: string,
    payload: DialogMessagePayload
  ): void {
    if (!payload?.content || typeof payload.content !== "string") {
      return;
    }
    const role =
      payload.role === "user" ||
      payload.role === "assistant" ||
      payload.role === "thinking"
        ? payload.role
        : "assistant";
    const message = this.sessionManager.appendMessage(
      sessionId,
      role,
      payload.content,
      payload.timestamp
    );
    if (message) {
      this.sessionStorage.appendMessage(sessionId, message);
      this.broadcaster({ type: "session:message", payload: message });
    }
  }

  private extractMessageContent(event: unknown): string | null {
    if (!event || typeof event !== "object") {
      return null;
    }
    const typed = event as {
      readonly content?: unknown;
      readonly data?: unknown;
    };
    if (typeof typed.content === "string") {
      return typed.content;
    }
    if (typed.content && typeof typed.content === "object") {
      return JSON.stringify(typed.content);
    }
    if (typed.data) {
      return JSON.stringify(typed.data);
    }
    return null;
  }

  private extractMessageContentAndTurnOptions(
    payload: MessageContentPayload
  ): MessageContentExtraction | null {
    if (typeof payload === "string") {
      return { content: payload };
    }
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const typed = payload as {
      readonly text?: unknown;
      readonly content?: unknown;
      readonly turnOptions?: unknown;
    };
    let content: string | null = null;
    if (typeof typed.text === "string") {
      content = typed.text;
    } else if (typeof typed.content === "string") {
      content = typed.content;
    }

    if (!content) {
      return null;
    }

    const turnOptions =
      typed.turnOptions &&
      typeof typed.turnOptions === "object" &&
      !Array.isArray(typed.turnOptions)
        ? (typed.turnOptions as Record<string, unknown>)
        : undefined;

    return { content, turnOptions };
  }

  private updateProviderBinding(
    sessionId: string,
    providerSessionId?: string
  ): void {
    if (!providerSessionId) {
      return;
    }
    const binding = this.providerSessions.get(sessionId);
    if (binding) {
      binding.providerSessionId = providerSessionId;
    }
  }

  private updateBindingWithResolvedId(
    sessionId: string,
    providerSessionId: string
  ): void {
    const session = this.sessionManager.getSession(sessionId);
    if (
      !session ||
      (session.providerSessionStatus === "ready" &&
        session.providerSessionId === providerSessionId)
    ) {
      return;
    }
    this.sessionManager.updateProviderSessionId(sessionId, providerSessionId);
    this.sessionStorage.promote(sessionId, providerSessionId);
    this.updateProviderBinding(sessionId, providerSessionId);
    this.continuity.updateProviderSessionId(sessionId, providerSessionId);
    this.updateDescriptionSessionRef(session, providerSessionId);

    this.broadcastSessionBinding(sessionId);
  }

  private broadcastSessionBinding(sessionId: string): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    this.broadcaster({
      type: "session:binding",
      payload: {
        sessionId,
        providerSessionId: session.providerSessionId ?? null,
        status: session.providerSessionStatus,
      },
    });
    this.stateBroadcaster();

    const providerSessionId = session.providerSessionId ?? null;
    const workspaceSlug = session.initiativeSlug ?? null;
    if (!(providerSessionId && workspaceSlug)) {
      return;
    }

    SessionContinuityFacade.readLastTokenUsageSnapshot({
      workspaceRoot: session.workspacePath,
      workspaceSlug,
      providerSessionId,
    })
      .then((snapshot) => {
        if (!snapshot) {
          return;
        }
        this.broadcaster({
          type: "session:stream",
          payload: {
            sessionId,
            event: {
              type: "stream_event",
              tokenUsage: { used: snapshot.used, limit: snapshot.limit },
              data: {
                kind: "token_usage",
                used: snapshot.used,
                limit: snapshot.limit,
              },
              uuid: "continuity::token_usage",
              timestamp: snapshot.updatedAt,
            },
          },
        });
      })
      .catch((error: unknown) => {
        this.logger.warn(
          "Failed to load token usage snapshot from continuity",
          {
            sessionId,
            providerSessionId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      });
  }

  private handleSessionIdChangedEvent(
    sessionId: string,
    payload: unknown
  ): void {
    const typed = payload as SessionIdChangedPayload;
    if (typed?.newId) {
      this.updateBindingWithResolvedId(sessionId, typed.newId);
    }
  }

  private handleRealSessionIdEvent(sessionId: string, payload: unknown): void {
    const typed = payload as { readonly sessionId?: unknown };
    if (typeof typed?.sessionId === "string") {
      this.updateBindingWithResolvedId(sessionId, typed.sessionId);
    }
  }

  private logSessionMessageReceived(
    sessionId: string,
    messagePayload: MessageContentPayload
  ): void {
    this.logger.info("Session message received", {
      sessionId,
      payloadType: typeof messagePayload,
    });
  }

  private logSessionMessageExtracted(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): void {
    this.logger.info("Session message extracted", {
      sessionId,
      contentLength: content.length,
      hasTurnOptions: turnOptions !== undefined,
    });
  }

  private logSessionNotFoundForIncomingMessage(sessionId: string): void {
    this.logger.warn("Session not found for incoming message", { sessionId });
  }

  private logResolvedSessionForIncomingMessage(
    sessionId: string,
    session: Session
  ): void {
    this.logger.info("Resolved session for incoming message", {
      sessionId,
      providerId: session.providerId,
      providerSessionId: session.providerSessionId ?? null,
      providerSessionStatus: session.providerSessionStatus,
      stage: session.stage ?? null,
      initiativeSlug: session.initiativeSlug ?? null,
      runSlug: session.runSlug ?? null,
    });
  }

  private logMissingProviderBindingForIncomingMessage(
    sessionId: string,
    providerId: string | undefined,
    hasBinding: boolean,
    hasAdapter: boolean
  ): void {
    this.logger.warn("Provider binding or adapter missing for session", {
      sessionId,
      providerId: providerId ?? null,
      hasBinding,
      hasAdapter,
    });
    this.logger.warn("Known provider session bindings", {
      sessionId,
      knownSessionIds: Array.from(this.providerSessions.keys()),
    });
  }

  private logDispatchingMessageToProvider(
    sessionId: string,
    binding: ProviderSessionBinding,
    contentLength: number
  ): void {
    this.logger.info("Dispatching message to provider adapter", {
      sessionId,
      providerId: binding.providerId,
      providerSessionId: binding.providerSessionId,
      contentLength,
    });
  }

  private logProviderSendMessageFailed(
    sessionId: string,
    binding: ProviderSessionBinding,
    error: unknown
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn("Provider sendMessage failed", {
      sessionId,
      providerId: binding.providerId,
      providerSessionId: binding.providerSessionId,
      error: message,
    });
  }

  private updateDescriptionSessionRef(
    session: Session,
    providerSessionId?: string
  ): void {
    if (session.stage !== "description") {
      return;
    }
    if (!session.initiativeSlug) {
      return;
    }
    const resolvedProviderSessionId =
      providerSessionId ?? session.providerSessionId;
    if (!resolvedProviderSessionId) {
      return;
    }
    const sessionKind =
      session.runSlug === "reviewer" ? "reviewer" : "collector";

    const jsonlPath = buildSessionFilePath({
      rootDirectory: SESSION_ROOT,
      workspaceSlug: sanitizeWorkspaceSlug(session.initiativeSlug),
      provider: session.providerId,
      sessionId: sanitizeWorkspaceSlug(resolvedProviderSessionId),
    });

    this.descriptionStepStore
      .upsert(session.workspacePath, session.initiativeSlug, {
        session: {
          providerId: session.providerId,
          providerSessionId: resolvedProviderSessionId,
          jsonlPath,
        },
        sessionKind,
      })
      .catch((error: unknown) => {
        this.logger.warn("Failed to persist description session ref", {
          sessionId: session.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }

  private getDefaultProviderId(): string {
    const providers = this.providerRegistry.listProviders();
    const activeProvider = providers.find(
      (provider) =>
        provider.status === "active" &&
        Boolean(this.providerRegistry.getAdapter(provider.id))
    );
    if (activeProvider) {
      return activeProvider.id;
    }
    const fallbackProvider = providers.find((provider) =>
      Boolean(this.providerRegistry.getAdapter(provider.id))
    );
    if (fallbackProvider) {
      return fallbackProvider.id;
    }
    return "claudeCodeCli";
  }
}
