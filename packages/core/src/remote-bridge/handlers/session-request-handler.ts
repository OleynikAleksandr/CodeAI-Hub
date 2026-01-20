import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import type { CoreConfig } from "../../config";
import type { ProviderRegistry } from "../../provider-registry";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
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
      callbacks: {
        sendMessage: async (sessionId, content) =>
          this.sendInternalMessage(sessionId, content),
        createSession: async (request) => this.createContinuitySession(request),
      },
      sessionLookup: (sessionId) => this.sessionManager.getSession(sessionId),
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

  private async resolveProviderSessionId(
    adapter: ProviderAdapter,
    providerId: string,
    workspacePath: string,
    requestedProviderSessionId: string | null
  ): Promise<ProviderSessionResolution> {
    const shouldResume =
      typeof requestedProviderSessionId === "string" &&
      requestedProviderSessionId.trim().length > 0;

    if (shouldResume) {
      if (!adapter.resumeSession) {
        return {
          error: `Provider ${providerId} does not support resume`,
        };
      }

      const providerSessionId = await adapter.resumeSession(
        requestedProviderSessionId.trim(),
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
  }): Promise<Session | null> {
    const providerSessionResolution = await this.resolveProviderSessionId(
      options.adapter,
      options.providerId,
      options.workspacePath,
      options.context.providerSessionId
    );
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
      }
    );

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

    if (typeof event === "string") {
      this.updateBindingWithResolvedId(sessionId, event);
      return;
    }
    if (!event || typeof event !== "object") {
      return;
    }
    this.handleTypedProviderEvent(sessionId, event as ProviderEventEnvelope);
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
      case "turn_failed":
      case "stream_error":
      case "error":
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
