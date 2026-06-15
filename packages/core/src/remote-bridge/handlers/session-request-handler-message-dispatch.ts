import path from "node:path";
import type { ProviderRegistry } from "../../provider-registry";
import { resolveProviderModelSyncCapabilities } from "../../provider-registry/provider-descriptor-factory";
import type { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import {
  type BridgeEvent,
  readAppliedProviderTurnConfig,
  serializeSessionModelBinding,
  shouldBroadcastAppliedProviderModelUpdate,
} from "../types";
import type { ProviderSessionBinding } from "./session-request-handler";
import type { SessionRequestHandlerAppliedTurnConfig } from "./session-request-handler-applied-turn-config";
import { buildDocumentationContinuationEnvelope } from "./session-request-handler-documentation-continuation-envelope";
import type { SessionRequestHandlerDocumentationRolloverState } from "./session-request-handler-documentation-rollover-state";
import {
  attachPendingCodexModelSwitchInjection,
  clearPendingCodexModelSwitchInjectionAfterDispatch,
} from "./session-request-handler-model-switch-injection";
import { triggerPostRebindUsageLimitsRefresh } from "./session-request-handler-post-rebind-usage-limits";
import { SessionRequestHandlerProviderSend } from "./session-request-handler-provider-send";
import { stripInternalWorkflowTurnOptions } from "./workflow-turn-control";

// Recognized across providers: each provider adapter throws its own typed
// stale-binding error with a provider-scoped code. The dispatch retry path is
// shared: a one-shot invalidate + ensureSessionReadyForSend + resend covers all
// of them.
const PROVIDER_STALE_BINDING_ERROR_CODES: ReadonlySet<string> = new Set([
  "GEMINI_SESSION_STALE_BINDING",
  "CLAUDE_SESSION_STALE_BINDING",
  "CODEX_SESSION_STALE_BINDING",
  "KIMI_SESSION_STALE_BINDING",
]);
const TECHNICAL_STAGE_REWRITE_BLOCKER_CODE =
  "technical_stage_rewrite_in_progress";
const TECHNICAL_STAGE_REWRITE_BLOCKED_STAGES: ReadonlySet<string> =
  new Set<string>();
const WORKSPACE_CONTEXT_HEADING = "## CodeAI Hub Workspace Context";
const BACKTICK_RE = /`/gu;

const inlineCode = (value: string): string =>
  `\`${value.replace(BACKTICK_RE, "\\`")}\``;

const buildProviderWorkspaceContextEnvelope = (
  session: Session,
  content: string
): string => {
  if (content.trimStart().startsWith(WORKSPACE_CONTEXT_HEADING)) {
    return content;
  }
  const workspaceRoot = path.resolve(session.workspacePath);
  const workspaceName = path.basename(workspaceRoot) || workspaceRoot;
  return [
    WORKSPACE_CONTEXT_HEADING,
    `- Workspace name: ${inlineCode(workspaceName)}.`,
    session.initiativeSlug
      ? `- Workspace slug: ${inlineCode(session.initiativeSlug)}.`
      : null,
    session.stage ? `- Workflow stage: ${inlineCode(session.stage)}.` : null,
    `- Workspace root: ${inlineCode(workspaceRoot)}.`,
    "- Treat this workspace root as the only base directory for relative `.codeai-hub/...` workflow artifact paths.",
    "- External absolute paths in user materials are input documents only; never reinterpret their parent directory as the workspace root.",
    "",
    content,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
};

const extractStaleProviderSessionId = (error: unknown): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }
  const code = (error as { code?: string }).code;
  if (!(code && PROVIDER_STALE_BINDING_ERROR_CODES.has(code))) {
    return null;
  }
  const candidate = (error as { providerSessionId?: string }).providerSessionId;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : null;
};

interface SessionRequestHandlerMessageDispatchDependencies {
  readonly appliedTurnConfig: SessionRequestHandlerAppliedTurnConfig;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly continuity: SessionContinuityFacade;
  readonly emitTurnStateEvent: (options: {
    readonly sessionId: string;
    readonly state: "idle" | "running";
  }) => void;
  readonly handleProviderFailure: (
    providerId: string,
    error: unknown,
    sessionId?: string
  ) => void;
  readonly logger: Logger;
  readonly providerRegistry: ProviderRegistry;
  readonly providerSessions: Map<string, ProviderSessionBinding>;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly trackPendingUserIntent: (sessionId: string, content: string) => void;
}

export interface StaleBindingRecoveryHooks {
  readonly ensureSessionReadyForSend: (session: Session) => Promise<boolean>;
  readonly invalidateProviderBinding: (sessionId: string) => void;
}

export class SessionRequestHandlerMessageDispatch {
  private readonly deps: SessionRequestHandlerMessageDispatchDependencies;
  private readonly providerSend: SessionRequestHandlerProviderSend;
  private documentationRolloverState: SessionRequestHandlerDocumentationRolloverState | null =
    null;
  private staleBindingRecoveryHooks: StaleBindingRecoveryHooks | null = null;

  setStaleBindingRecoveryHooks(hooks: StaleBindingRecoveryHooks): void {
    this.staleBindingRecoveryHooks = hooks;
  }

  setDocumentationRolloverState(
    state: SessionRequestHandlerDocumentationRolloverState
  ): void {
    this.documentationRolloverState = state;
  }

  constructor(deps: SessionRequestHandlerMessageDispatchDependencies) {
    this.deps = deps;
    this.providerSend = new SessionRequestHandlerProviderSend(deps.logger);
  }

  async sendInternalMessage(sessionId: string, content: string): Promise<void> {
    const resolved = this.resolveBoundProviderChannel(sessionId);
    if (!resolved) {
      this.deps.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message: "Provider binding is unavailable for internal message.",
          code: "missing_provider_binding",
          retryable: false,
        },
      });
      return;
    }

    this.deps.emitTurnStateEvent({ sessionId, state: "running" });
    try {
      await this.deps.continuity.ensureTrackedOnOutboundMessage({
        sessionId,
        providerSessionId: resolved.binding.providerSessionId,
      });
    } catch (error) {
      this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
      this.deps.logger.warn("Continuity tracking failed for internal message", {
        sessionId,
        providerId: resolved.binding.providerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    try {
      const session = this.deps.sessionManager.getSession(sessionId);
      const providerContent = session
        ? buildProviderWorkspaceContextEnvelope(session, content)
        : content;
      const providerTurnOptions = this.attachProviderTurnOptions(
        sessionId,
        resolved.binding.providerId
      );
      await this.providerSend.dispatch({
        adapter: resolved.adapter,
        content: providerContent,
        providerId: resolved.binding.providerId,
        providerSessionId: resolved.binding.providerSessionId,
        providerTurnOptions,
        sessionId,
      });
      clearPendingCodexModelSwitchInjectionAfterDispatch(
        this.deps.sessionManager,
        sessionId,
        providerTurnOptions
      );
    } catch (error) {
      this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
      this.deps.logger.warn("Provider sendMessage failed", {
        sessionId,
        providerId: resolved.binding.providerId,
        providerSessionId: resolved.binding.providerSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.deps.handleProviderFailure(
        resolved.binding.providerId,
        error,
        sessionId
      );
    }
  }

  async dispatchUserMessage(options: {
    readonly content: string;
    readonly hiddenUserMessage: boolean;
    readonly messageTag?: string;
    readonly session: Session;
    readonly sessionId: string;
    readonly turnOptions?: Record<string, unknown>;
  }): Promise<void> {
    const {
      content,
      hiddenUserMessage,
      messageTag,
      session,
      sessionId,
      turnOptions,
    } = options;
    const stage = session.stage ?? null;
    if (stage && TECHNICAL_STAGE_REWRITE_BLOCKED_STAGES.has(stage)) {
      if (
        !(
          hiddenUserMessage ||
          (await this.appendVisibleUserMessage(session, sessionId, content, {
            tag: messageTag,
          }))
        )
      ) {
        return;
      }
      this.deps.logger.warn(
        "Technical stage user message blocked during orchestration rewrite",
        { code: TECHNICAL_STAGE_REWRITE_BLOCKER_CODE, sessionId, stage }
      );
      this.deps.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message:
            "Technical stage orchestration is temporarily disabled while the orchestration cluster is being rewritten.",
          code: TECHNICAL_STAGE_REWRITE_BLOCKER_CODE,
          retryable: false,
        },
      });
      return;
    }
    if (
      !(
        hiddenUserMessage ||
        (await this.appendVisibleUserMessage(session, sessionId, content, {
          tag: messageTag,
        }))
      )
    ) {
      return;
    }

    const resolved = this.resolveBoundProviderChannel(sessionId);
    if (!resolved) {
      this.deps.trackPendingUserIntent(sessionId, content);
      this.deps.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message:
            "Provider binding is unavailable. Your message has been saved and will be retried when the provider recovers.",
          code: "missing_provider_binding",
          retryable: true,
        },
      });
      return;
    }

    this.deps.emitTurnStateEvent({ sessionId, state: "running" });
    let providerContent = content;
    try {
      providerContent = await buildDocumentationContinuationEnvelope({
        context:
          this.documentationRolloverState?.consumeByTargetSessionId(
            sessionId
          ) ?? null,
        userMessage: content,
      });
      providerContent = buildProviderWorkspaceContextEnvelope(
        session,
        providerContent
      );
      await this.deps.continuity.ensureTrackedOnOutboundMessage({
        sessionId,
        providerSessionId: resolved.binding.providerSessionId,
      });
      const providerTurnOptions = this.attachProviderTurnOptions(
        sessionId,
        resolved.binding.providerId,
        stripInternalWorkflowTurnOptions(turnOptions)
      );
      await this.providerSend.dispatch({
        adapter: resolved.adapter,
        content: providerContent,
        providerId: resolved.binding.providerId,
        providerSessionId: resolved.binding.providerSessionId,
        providerTurnOptions,
        sessionId,
      });
      clearPendingCodexModelSwitchInjectionAfterDispatch(
        this.deps.sessionManager,
        sessionId,
        providerTurnOptions
      );
    } catch (error) {
      const staleProviderSessionId = extractStaleProviderSessionId(error);
      if (staleProviderSessionId) {
        const retried = await this.retryAfterStaleBinding({
          content: providerContent,
          session,
          sessionId,
          staleProviderSessionId,
          turnOptions,
        });
        if (retried) {
          return;
        }
      }
      this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
      this.deps.logger.warn("Provider sendMessage failed", {
        sessionId,
        providerId: resolved.binding.providerId,
        providerSessionId: resolved.binding.providerSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.deps.handleProviderFailure(
        resolved.binding.providerId,
        error,
        sessionId
      );
    }
  }

  private async retryAfterStaleBinding(options: {
    readonly content: string;
    readonly session: Session;
    readonly sessionId: string;
    readonly staleProviderSessionId: string;
    readonly turnOptions?: Record<string, unknown>;
  }): Promise<boolean> {
    const { content, session, sessionId, staleProviderSessionId, turnOptions } =
      options;
    const hooks = this.staleBindingRecoveryHooks;
    if (!hooks) {
      this.deps.logger.warn(
        "Stale-binding retry unavailable: recovery hooks not wired",
        { sessionId, staleProviderSessionId }
      );
      return false;
    }
    this.deps.logger.warn(
      "Stale provider session detected during send; invalidating binding and retrying once",
      {
        sessionId,
        staleProviderSessionId,
        providerId: session.providerId,
      }
    );
    hooks.invalidateProviderBinding(sessionId);
    const ready = await hooks.ensureSessionReadyForSend(session);
    if (!ready) {
      this.deps.logger.warn(
        "Stale-binding rebind did not complete; surfacing original error",
        { sessionId, staleProviderSessionId }
      );
      return false;
    }
    const retryResolved = this.resolveBoundProviderChannel(sessionId);
    if (!retryResolved) {
      this.deps.logger.warn(
        "Stale-binding retry aborted: no bound provider channel after rebind",
        { sessionId }
      );
      return false;
    }
    try {
      await this.deps.continuity.ensureTrackedOnOutboundMessage({
        sessionId,
        providerSessionId: retryResolved.binding.providerSessionId,
      });
      const providerTurnOptions = this.attachProviderTurnOptions(
        sessionId,
        retryResolved.binding.providerId,
        stripInternalWorkflowTurnOptions(turnOptions)
      );
      await this.providerSend.dispatch({
        adapter: retryResolved.adapter,
        content,
        providerId: retryResolved.binding.providerId,
        providerSessionId: retryResolved.binding.providerSessionId,
        providerTurnOptions,
        sessionId,
      });
      clearPendingCodexModelSwitchInjectionAfterDispatch(
        this.deps.sessionManager,
        sessionId,
        providerTurnOptions
      );
      triggerPostRebindUsageLimitsRefresh({
        adapter: retryResolved.adapter,
        broadcaster: this.deps.broadcaster,
        logger: this.deps.logger,
        providerId: retryResolved.binding.providerId,
        providerSessionId: retryResolved.binding.providerSessionId,
        session,
        sessionId,
      });
      return true;
    } catch (retryError) {
      this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
      this.deps.logger.warn(
        "Stale-binding retry failed; surfacing provider failure",
        {
          sessionId,
          providerId: retryResolved.binding.providerId,
          providerSessionId: retryResolved.binding.providerSessionId,
          error:
            retryError instanceof Error
              ? retryError.message
              : String(retryError),
        }
      );
      this.deps.handleProviderFailure(
        retryResolved.binding.providerId,
        retryError,
        sessionId
      );
      return true;
    }
  }

  private async appendVisibleUserMessage(
    session: Session,
    sessionId: string,
    content: string,
    options: { readonly tag?: string } = {}
  ): Promise<boolean> {
    const userMessage = this.deps.sessionManager.appendMessage(
      sessionId,
      "user",
      content,
      options.tag ? { tag: options.tag } : undefined
    );
    if (!userMessage) {
      this.deps.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      return false;
    }

    try {
      await this.deps.sessionStorage.appendMessage(sessionId, userMessage);
    } catch (error: unknown) {
      this.deps.logger.error(
        "Failed to append unified session record",
        error as Error,
        {
          sessionId,
          providerId: session.providerId,
        }
      );
      this.deps.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message: "Failed to persist message to history",
        },
      });
      return false;
    }

    this.deps.broadcaster({ type: "session:message", payload: userMessage });
    return true;
  }

  private resolveBoundProviderChannel(sessionId: string): {
    readonly adapter: NonNullable<ReturnType<ProviderRegistry["getAdapter"]>>;
    readonly binding: ProviderSessionBinding;
  } | null {
    const binding = this.deps.providerSessions.get(sessionId);
    const adapter = binding
      ? this.deps.providerRegistry.getAdapter(binding.providerId)
      : null;
    if (!(binding && adapter)) {
      this.logMissingProviderBindingForIncomingMessage(
        sessionId,
        binding?.providerId,
        Boolean(binding),
        Boolean(adapter)
      );
      return null;
    }
    return { binding, adapter };
  }

  private attachProviderTurnOptions(
    sessionId: string,
    providerId: string,
    turnOptions?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    const session = this.deps.sessionManager.getSession(sessionId);
    const providerTurnOptions = this.deps.appliedTurnConfig.attachToTurnOptions(
      {
        providerId,
        sessionModelBinding: session?.modelBinding ?? null,
        turnOptions,
      }
    );
    const providerTurnOptionsWithInjection =
      attachPendingCodexModelSwitchInjection({
        providerId,
        session,
        turnOptions: providerTurnOptions,
      });
    const modelUpdateEligibility = {
      turnConfig: readAppliedProviderTurnConfig(
        providerTurnOptionsWithInjection
      ),
      syncsLabelFromAppliedConfig:
        resolveProviderModelSyncCapabilities(providerId)
          .syncsLabelFromAppliedConfig,
    };
    if (!shouldBroadcastAppliedProviderModelUpdate(modelUpdateEligibility)) {
      return providerTurnOptionsWithInjection;
    }
    const { turnConfig } = modelUpdateEligibility;
    const modelId = turnConfig.effectiveModelId ?? turnConfig.modelId;
    const baseModelId =
      turnConfig.baseModelId ??
      (turnConfig.effectiveModelId ? turnConfig.modelId : undefined);
    this.deps.broadcaster({
      type: "session:model:update",
      payload: {
        sessionId,
        providerId: turnConfig.providerId,
        baseModelId,
        modelId,
        modelBinding: session
          ? (serializeSessionModelBinding(session) ?? undefined)
          : undefined,
      },
    });
    return providerTurnOptionsWithInjection;
  }

  private logMissingProviderBindingForIncomingMessage(
    sessionId: string,
    providerId: string | undefined,
    hasBinding: boolean,
    hasAdapter: boolean
  ): void {
    this.deps.logger.warn("Provider binding or adapter missing for session", {
      sessionId,
      providerId: providerId ?? null,
      hasBinding,
      hasAdapter,
    });
    this.deps.logger.warn("Known provider session bindings", {
      sessionId,
      knownSessionIds: Array.from(this.deps.providerSessions.keys()),
    });
  }
}
