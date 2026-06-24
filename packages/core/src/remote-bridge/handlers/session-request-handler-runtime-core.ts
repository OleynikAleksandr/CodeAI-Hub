import type { ClaudeHaikuTranslationService } from "@codeai-hub/claude-module";
import { FlowNodeContinuityFacade } from "../../flow-node-continuity/flow-node-continuity-facade";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import {
  type SessionModelBinding,
  SessionModelBindingFacade,
} from "../../session-model-binding";
import { SessionModelBindingResolver } from "../../session-model-binding/session-model-binding-resolver";
import { SessionTranslationFacade } from "../../session-translation/session-translation-facade";
import { createCoreTranslationFacade } from "../../translation/core-translation-facade-factory";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { waitForDevelopmentTreeAgentTurnSettled } from "./development-tree-agent-turn-settle-waiter";
import { SessionContinuityLockService } from "./session-continuity-lock-service";
import { SessionDescriptionDialogSync } from "./session-description-dialog-sync";
import { SessionProviderBindingService } from "./session-provider-binding-service";
import { SessionProviderEventRouter } from "./session-provider-event-router";
import { SessionProviderFailureRecovery } from "./session-provider-failure-recovery";
import { SessionRequestHandlerAppliedTurnConfig } from "./session-request-handler-applied-turn-config";
import { SessionRequestHandlerContinuityRoot } from "./session-request-handler-continuity-root";
import { SessionRequestHandlerDialogSegmentMeta } from "./session-request-handler-dialog-segment-meta";
import { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";
import { SessionRequestHandlerManagedWorkflowTurn } from "./session-request-handler-managed-workflow-turn";
import { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";
import { SessionRequestHandlerResumeLifecycle } from "./session-request-handler-resume-lifecycle";
import { SessionRequestHandlerRetryState } from "./session-request-handler-retry-state";
import type { SessionRequestHandlerRuntimeDependencies } from "./session-request-handler-runtime-types";
import { SessionRequestHandlerSessionBootstrap } from "./session-request-handler-session-bootstrap";
import { SessionRequestHandlerSessionResolution } from "./session-request-handler-session-resolution";

export interface ContinuityRolloverBridge {
  clearPendingState(sessionId: string): void;
  clearTokenUsageSnapshot(sessionId: string): void;
}

export interface SessionRequestHandlerRuntimeCore {
  readonly appliedTurnConfig: SessionRequestHandlerAppliedTurnConfig;
  readonly continuity: SessionContinuityFacade;
  readonly continuityLockService: SessionContinuityLockService;
  readonly continuityRoot: SessionRequestHandlerContinuityRoot;
  readonly descriptionDialogSync: SessionDescriptionDialogSync;
  readonly dialogSegmentMeta: SessionRequestHandlerDialogSegmentMeta;
  readonly eventMessages: SessionRequestHandlerEventMessages;
  readonly flowNodeContinuity: FlowNodeContinuityFacade;
  readonly messageDispatch: SessionRequestHandlerMessageDispatch;
  readonly providerBindingService: SessionProviderBindingService;
  readonly providerEventRouter: SessionProviderEventRouter;
  readonly providerFailureRecovery: SessionProviderFailureRecovery;
  readonly resumeLifecycle: SessionRequestHandlerResumeLifecycle;
  readonly retryState: SessionRequestHandlerRetryState;
  readonly sessionBootstrap: SessionRequestHandlerSessionBootstrap;
  readonly sessionResolution: SessionRequestHandlerSessionResolution;
  readonly sessionTranslation: SessionTranslationFacade;
}

interface ClaudeTranslationServiceOwner {
  readonly getHaikuTranslationService?: () => ClaudeHaikuTranslationService;
}

const resolveDefaultSettingsPath = (
  config: SessionRequestHandlerRuntimeDependencies["config"]
): string =>
  resolveWorkspaceRuntimeCapsule({
    workspaceRoot: config.claudeWorkspacePath ?? process.cwd(),
    workspaceSlug: config.claudeProjectSlug,
  }).settingsFile.absolutePath;

const resolveWorkspaceSettingsPath = (options: {
  readonly fallbackSettingsPath: string;
  readonly workspacePath?: string | null;
  readonly workspaceSlug?: string | null;
}): string => {
  const workspaceRoot = options.workspacePath?.trim();
  const workspaceSlug = options.workspaceSlug?.trim();
  if (!(workspaceRoot && workspaceSlug)) {
    return options.fallbackSettingsPath;
  }
  return resolveWorkspaceRuntimeCapsule({
    workspaceRoot,
    workspaceSlug,
  }).settingsFile.absolutePath;
};

const createDeferredRuntimeRef = <TDependency>(name: string) => {
  let value: TDependency | undefined;
  return {
    get: () => {
      if (value === undefined) {
        throw new Error(
          `Session request runtime dependency "${name}" was used before initialization`
        );
      }
      return value;
    },
    set: (nextValue: TDependency) => {
      value = nextValue;
    },
  };
};

export const resolveClaudeHaikuTranslationServiceForRuntime = (
  options: SessionRequestHandlerRuntimeDependencies
): ClaudeHaikuTranslationService | undefined => {
  const adapter = options.providerRegistry.getAdapter("claudeCodeCli") as
    | ClaudeTranslationServiceOwner
    | undefined;
  return adapter?.getHaikuTranslationService?.();
};

export const createSessionRequestHandlerRuntimeCore = (
  options: SessionRequestHandlerRuntimeDependencies,
  continuityRolloverBridge: ContinuityRolloverBridge
): SessionRequestHandlerRuntimeCore => {
  const defaultSettingsPath = resolveDefaultSettingsPath(options.config);
  const messageDispatchRef =
    createDeferredRuntimeRef<SessionRequestHandlerMessageDispatch>(
      "messageDispatch"
    );
  const sessionResolutionRef =
    createDeferredRuntimeRef<SessionRequestHandlerSessionResolution>(
      "sessionResolution"
    );
  const continuity: SessionContinuityFacade = new SessionContinuityFacade({
    logger: options.logger,
    clock: options.continuityClock,
    remainingRatioThreshold: Math.min(
      1,
      Math.max(
        0,
        options.config.claudeContinuityRemainingPercentThreshold / 100
      )
    ),
    enableLegacyHandoff: false,
    callbacks: {
      sendMessage: async (sessionId, content) =>
        await messageDispatchRef.get().sendInternalMessage(sessionId, content),
      createSession: async (request) =>
        await sessionResolutionRef.get().createContinuitySession(request),
    },
    sessionLookup: (sessionId) => options.sessionManager.getSession(sessionId),
  });
  const flowNodeContinuity = new FlowNodeContinuityFacade({
    templatesDir: options.config.templatesDir,
    preemptRemainingPercentThreshold:
      options.config.continuityPreemptRemainingPercentThreshold,
  });
  const resumeLifecycle = new SessionRequestHandlerResumeLifecycle({
    sessionManager: options.sessionManager,
    workspaceRuntime: options.workspaceRuntime,
    clearTokenUsageSnapshot: (sessionId) =>
      continuityRolloverBridge.clearTokenUsageSnapshot(sessionId),
    emitContinuityLockEvent: options.callbacks.emitContinuityLockEvent,
    finalizePendingTurnCompletion:
      options.callbacks.runTurnCompletedArbitration,
    isFlowNodeRolloverPending: options.callbacks.isFlowNodeRolloverPending,
  });
  const continuityLockService = new SessionContinuityLockService({
    sessionManager: options.sessionManager,
    broadcaster: options.broadcaster,
    workspaceRuntime: options.workspaceRuntime,
    clearPostTurnContextDecision: (sessionId) =>
      resumeLifecycle.clearPostTurnContextDecision(sessionId),
    clearRolloverSessionState: (sessionId) =>
      continuityRolloverBridge.clearPendingState(sessionId),
    getSessionResumeLifecycleState: (session) =>
      resumeLifecycle.getSessionResumeLifecycleState(session),
    updateSessionResumeLifecycleState: (session, patch) =>
      resumeLifecycle.updateSessionResumeLifecycleState(session, patch),
  });
  const descriptionDialogSync = new SessionDescriptionDialogSync({
    sessionStorage: options.sessionStorage,
    continuityRootBySessionId: options.continuityRootBySessionId,
    logger: options.logger,
  });
  const continuityRoot = new SessionRequestHandlerContinuityRoot({
    logger: options.logger,
    sessionStorage: options.sessionStorage,
  });
  const claudeHaikuTranslationService =
    resolveClaudeHaikuTranslationServiceForRuntime(options);
  const sessionTranslation = new SessionTranslationFacade({
    logger: options.logger,
    settingsPath: defaultSettingsPath,
    translationFacadeFactory: ({ reporter }) =>
      createCoreTranslationFacade({
        claudeHaikuTranslationService,
        reporter,
      }),
  });
  const eventMessages = new SessionRequestHandlerEventMessages({
    broadcaster: options.broadcaster,
    continuityRootBySessionId: options.continuityRootBySessionId,
    logger: options.logger,
    sessionManager: options.sessionManager,
    sessionStorage: options.sessionStorage,
    sessionTranslation,
  });
  const managedWorkflowTurn = new SessionRequestHandlerManagedWorkflowTurn({
    developmentTreeAgentGateway: {
      createSessionForWorkflow: async (workflowOptions) =>
        await options.callbacks.createSessionForWorkflow(workflowOptions),
      handleMessage: async (sessionId, content) =>
        await messageDispatchRef.get().sendInternalMessage(sessionId, content),
      waitForInitialTurnSettled: async (sessionId) => {
        const session = options.sessionManager.getSession(sessionId);
        const result = await waitForDevelopmentTreeAgentTurnSettled({
          sessionId,
          workspaceRoot:
            session?.workspacePath ??
            options.config.claudeWorkspacePath ??
            process.cwd(),
          workspaceRuntime: options.workspaceRuntime,
        });
        if (result === "timeout") {
          options.logger.warn(
            "Timed out waiting for Development Tree Product Part initial turn to settle",
            { sessionId }
          );
        }
      },
      persistStartPrompt: async (sessionId, content) => {
        eventMessages.appendDialogMessage(sessionId, {
          content,
          role: "user",
          tag: "development-tree-agent-start-prompt",
        });
        await eventMessages.waitForMessagePersistence(sessionId);
      },
    },
    eventMessages,
    getMessageDispatch: () => messageDispatchRef.get(),
    sessionManager: options.sessionManager,
  });
  const retryState = new SessionRequestHandlerRetryState({
    broadcaster: options.broadcaster,
    logger: options.logger,
  });
  const providerBindingService = new SessionProviderBindingService({
    sessionManager: options.sessionManager,
    sessionStorage: options.sessionStorage,
    continuity,
    providerSessions: options.providerSessions,
    broadcaster: options.broadcaster,
    stateBroadcaster: options.stateBroadcaster,
    logger: options.logger,
    workspaceRuntime: options.workspaceRuntime,
    updateDescriptionSessionRef: (session, providerSessionId) =>
      descriptionDialogSync.updateDescriptionSessionRef(
        session,
        providerSessionId
      ),
  });
  const appliedTurnConfig = new SessionRequestHandlerAppliedTurnConfig(
    options.config
  );
  const sessionModelBindingResolver = new SessionModelBindingResolver({
    facade: new SessionModelBindingFacade(),
    providerTurnConfig: {
      env: process.env,
      fallbackClaudeModel: options.config.claudeDefaultModel,
      fallbackCodexModel: options.config.codexDefaultModel ?? "gpt-5.4-mini",
      fallbackCodexReasoningEffort:
        options.config.codexDefaultReasoningEffort ?? "medium",
      settingsPath: defaultSettingsPath,
    },
    settingsPathResolver: (key) =>
      resolveWorkspaceSettingsPath({
        fallbackSettingsPath: defaultSettingsPath,
        workspacePath: key.workspacePath,
        workspaceSlug: key.workspaceSlug ?? key.initiativeSlug,
      }),
  });
  const providerEventRouter = new SessionProviderEventRouter({
    sessionManager: options.sessionManager,
    broadcaster: options.broadcaster,
    logger: options.logger,
    workspaceRuntime: options.workspaceRuntime,
    handleSessionContinuityProviderEvent: (sessionId, event) =>
      continuity.handleProviderEvent(sessionId, event),
    handleFlowNodeContinuityProviderEvent:
      options.callbacks.handleFlowNodeContinuityProviderEvent,
    handleManagedWorkflowTurnCompleted: async (sessionId) =>
      await managedWorkflowTurn.handleTurnCompleted(sessionId),
    updateBindingWithResolvedId: (sessionId, providerSessionId) =>
      providerBindingService.updateBindingWithResolvedId(
        sessionId,
        providerSessionId
      ),
    markPostTurnContextDecisionPending: (sessionId) =>
      resumeLifecycle.markPostTurnContextDecisionPending(sessionId),
    handleTurnCompletedWithFlowNodeArbitration:
      options.callbacks.handleTurnCompletedWithFlowNodeArbitration,
    clearPostTurnContextDecision: (sessionId) =>
      resumeLifecycle.clearPostTurnContextDecision(sessionId),
    emitTurnStateEvent: options.callbacks.emitTurnStateEvent,
    finalizeFlowNodeContinuityLockOnBootstrapGate:
      options.callbacks.finalizeFlowNodeContinuityLockOnBootstrapGate,
    appendProviderMessage: (sessionId, role, event) =>
      eventMessages.appendProviderMessage(sessionId, role, event),
    appendDialogMessage: (sessionId, payload) =>
      eventMessages.appendDialogMessage(sessionId, payload),
    waitForProviderMessagePersistence: (sessionId) =>
      eventMessages.waitForMessagePersistence(sessionId),
    resolveEffectiveModelId: ({ providerId, targetModelId }) =>
      appliedTurnConfig.resolveEffectiveModelId(providerId, targetModelId),
  });
  const providerFailureRecovery = new SessionProviderFailureRecovery({
    providerRegistry: options.providerRegistry,
    sessionManager: options.sessionManager,
    sessionStorage: options.sessionStorage,
    providerSessions: options.providerSessions,
    broadcaster: options.broadcaster,
    stateBroadcaster: options.stateBroadcaster,
    logger: options.logger,
    broadcastSessionBinding: (sessionId) =>
      providerBindingService.broadcastSessionBinding(sessionId),
    emitTurnStateEvent: options.callbacks.emitTurnStateEvent,
    consumeRetryBudget: (sessionId, failureClass) =>
      retryState.consumeRetryBudget(sessionId, failureClass),
    expirePendingUserIntent: (sessionId) =>
      retryState.expirePendingUserIntent(sessionId),
  });
  const messageDispatch = new SessionRequestHandlerMessageDispatch({
    appliedTurnConfig,
    sessionManager: options.sessionManager,
    sessionStorage: options.sessionStorage,
    continuity,
    providerRegistry: options.providerRegistry,
    providerSessions: options.providerSessions,
    broadcaster: options.broadcaster,
    logger: options.logger,
    emitTurnStateEvent: options.callbacks.emitTurnStateEvent,
    handleProviderFailure: options.callbacks.handleProviderFailure,
    trackPendingUserIntent: (sessionId, content) =>
      retryState.trackPendingUserIntent(sessionId, content),
  });
  messageDispatchRef.set(messageDispatch);
  const dialogSegmentMeta = new SessionRequestHandlerDialogSegmentMeta({
    broadcaster: options.broadcaster,
    continuity,
    continuityRootBySessionId: options.continuityRootBySessionId,
    logger: options.logger,
    sessionManager: options.sessionManager,
    sessionStorage: options.sessionStorage,
  });
  const sessionBootstrap = new SessionRequestHandlerSessionBootstrap({
    sessionManager: options.sessionManager,
    sessionStorage: options.sessionStorage,
    continuity,
    continuityRootBySessionId: options.continuityRootBySessionId,
    providerSessions: options.providerSessions,
    broadcaster: options.broadcaster,
    broadcastSessionBinding: (sessionId) =>
      providerBindingService.broadcastSessionBinding(sessionId),
    bindSessionModel: (bindingOptions) => {
      let binding: SessionModelBinding | null = null;
      if (bindingOptions.inheritedModelBinding) {
        binding = sessionModelBindingResolver.inheritBinding({
          providerId: bindingOptions.session.providerId,
          sessionId: bindingOptions.session.id,
          continuityRootId: bindingOptions.continuityRootSessionId,
          workspacePath: bindingOptions.session.workspacePath,
          workspaceSlug: bindingOptions.session.initiativeSlug,
          stage: bindingOptions.session.stage,
          runSlug: bindingOptions.session.runSlug,
          sourceBinding: bindingOptions.inheritedModelBinding,
        });
      } else if (bindingOptions.targetModelId) {
        binding = sessionModelBindingResolver.bindFromExplicitSelection({
          providerId: bindingOptions.session.providerId,
          sessionId: bindingOptions.session.id,
          continuityRootId: bindingOptions.continuityRootSessionId,
          workspacePath: bindingOptions.session.workspacePath,
          workspaceSlug: bindingOptions.session.initiativeSlug,
          stage: bindingOptions.session.stage,
          runSlug: bindingOptions.session.runSlug,
          targetModelId: bindingOptions.targetModelId,
        });
      } else {
        binding = sessionModelBindingResolver.bindFromSettingsDefault({
          providerId: bindingOptions.session.providerId,
          sessionId: bindingOptions.session.id,
          continuityRootId: bindingOptions.continuityRootSessionId,
          workspacePath: bindingOptions.session.workspacePath,
          workspaceSlug: bindingOptions.session.initiativeSlug,
          stage: bindingOptions.session.stage,
          runSlug: bindingOptions.session.runSlug,
        });
      }
      if (binding) {
        options.sessionManager.setModelBinding(
          bindingOptions.session.id,
          binding
        );
      }
    },
    resolveContinuityRootSessionId:
      options.callbacks.resolveContinuityRootSessionId,
    resolveDescriptionDialog: (dialogOptions) =>
      descriptionDialogSync.resolveDescriptionDialog(dialogOptions),
    maybePromoteLegacyDescriptionDialogHistory: (promotionOptions) =>
      descriptionDialogSync.maybePromoteLegacyDescriptionDialogHistory(
        promotionOptions
      ),
    maybeBackfillDescriptionDialogHistory: async (backfillOptions) =>
      await descriptionDialogSync.maybeBackfillDescriptionDialogHistory(
        backfillOptions
      ),
    updateDescriptionSessionRef: async (session, providerSessionId) =>
      await descriptionDialogSync.updateDescriptionSessionRef(
        session,
        providerSessionId
      ),
    handleProviderEvent: options.callbacks.handleProviderEvent,
    handleProviderFailure: options.callbacks.handleProviderFailure,
    updateProviderBinding: (sessionId, providerSessionId) =>
      providerBindingService.updateProviderBinding(
        sessionId,
        providerSessionId
      ),
    appendDialogSegmentBoundaryMeta: (boundaryOptions) =>
      dialogSegmentMeta.appendDialogSegmentBoundaryMeta(boundaryOptions),
    resumeLifecycle,
    workspaceRuntime: options.workspaceRuntime,
  });
  const sessionResolution = new SessionRequestHandlerSessionResolution({
    broadcaster: options.broadcaster,
    broadcastSessionBinding: (sessionId) =>
      providerBindingService.broadcastSessionBinding(sessionId),
    getDefaultProviderId: options.callbacks.getDefaultProviderId,
    handleMessage: options.callbacks.handleMessage,
    handleProviderFailure: options.callbacks.handleProviderFailure,
    logger: options.logger,
    providerRegistry: options.providerRegistry,
    sessionBootstrap,
    sessionManager: options.sessionManager,
    workspacePathOverride: options.config.claudeWorkspacePath,
  });
  sessionResolutionRef.set(sessionResolution);
  return {
    appliedTurnConfig,
    continuity,
    continuityLockService,
    continuityRoot,
    descriptionDialogSync,
    dialogSegmentMeta,
    eventMessages,
    flowNodeContinuity,
    messageDispatch,
    providerBindingService,
    providerEventRouter,
    providerFailureRecovery,
    resumeLifecycle,
    retryState,
    sessionBootstrap,
    sessionResolution,
    sessionTranslation,
  };
};
