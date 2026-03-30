import type { CoreConfig } from "../../config";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { SessionResumeMode } from "../../workspace-runtime/workspace-runtime-types";
import type { BridgeEvent } from "../types";

export interface ProviderSessionBinding {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
}

export interface ContinuityRootResolutionOptions {
  readonly context: {
    readonly initiativeSlug: string | null;
    readonly stage: string | null;
    readonly runSlug: string | null;
    readonly providerSessionId: string | null;
  };
  readonly providerId: string;
  readonly rootSessionIdOverride: string | null;
  readonly sessionId: string;
  readonly workspaceRoot: string;
}

export interface CreateAndRegisterSessionOptions {
  readonly adapter: NonNullable<ReturnType<ProviderRegistry["getAdapter"]>>;
  readonly context: ContinuityRootResolutionOptions["context"];
  readonly continuationParentId?: string | null;
  readonly providerId: string;
  readonly resumeMode?: SessionResumeMode;
  readonly rootSessionId?: string | null;
  readonly silent?: boolean;
  readonly workspacePath: string;
}

export interface ShellSessionCreationResult {
  readonly continuityRootSessionId: string;
  readonly session: Session;
}

/** Typed access to private/internal fields of SessionRequestHandler for test harness monkey-patching. */
export interface HandlerTestInternals {
  continuity: Record<string, unknown>;
  continuityLockService: {
    emitContinuityLockEvent: (options: Record<string, unknown>) => void;
    finalizeFlowNodeContinuityLock: (options: {
      readonly sessionId: string;
      readonly reason: string;
    }) => void;
    hasContext: (sessionId: string) => boolean;
    registerFlowNodeContinuityLockContext: (
      context: Record<string, unknown>
    ) => void;
  };
  continuityRolloverOrchestrator: {
    getTokenUsageSnapshot: (sessionId: string) => unknown;
    hasPending: (sessionId: string) => boolean;
    rolloverInFlight: Set<string>;
    rolloverStarted: Set<string>;
    startFlowNodeRolloverFromUsage: (
      options: { readonly sessionId: string } & Record<string, unknown>
    ) => Promise<void>;
  };
  descriptionDialogSync: Record<string, unknown> & {
    resolveDescriptionDialog: (
      options: Record<string, unknown>
    ) => Promise<{ dialogSessionId: string; shouldBackfill: boolean } | null>;
    updateDescriptionSessionRef: (
      session: unknown,
      providerSessionId: string
    ) => Promise<void>;
  };
  flowNodeContinuity: Record<string, unknown>;
  flowNodeRollover: {
    rolloverFlowNodeSession: (
      session: unknown,
      rollover: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => Promise<void>;
  };
  handleFlowNodeContinuityProviderEvent: (
    sessionId: string,
    event: unknown
  ) => Promise<void>;
  handleFlowNodeContinuitySilentPreemptiveRollover: () => Promise<boolean>;
  messageDispatch: {
    sendInternalMessage: (sessionId: string, content: string) => Promise<void>;
  };
  providerEventRouter: {
    handleProviderEvent: (sessionId: string, event: unknown) => void;
  };
  providerSessions: Map<string, ProviderSessionBinding>;
  resolveContinuityRootSessionId: (
    options: { readonly sessionId: string } & Record<string, unknown>
  ) => Promise<string>;
  resolveLiveContinuityRemainingPercentThreshold: (
    session: unknown
  ) => Promise<number>;
  resumeLifecycle: {
    recordPostTurnContextDecision: (
      sessionId: string,
      decision: string
    ) => void;
    sessionResumeLifecycleStates: Map<string, unknown>;
  };
  sendInternalMessage: (sessionId: string, content: string) => Promise<void>;
  sessionBootstrap: Record<string, unknown>;
  sessionShellFactory: {
    createBoundSession: (
      options: Record<string, unknown>,
      providerSessionId: string,
      silent: boolean
    ) => Promise<{ readonly id: string }>;
    createShellSession: (
      options: Record<string, unknown>
    ) => Promise<{ readonly session: { readonly id: string } }>;
    bindShellSession: (
      options: Record<string, unknown>,
      shell: unknown,
      providerSessionId: string,
      silent: boolean
    ) => Promise<void>;
  };
  turnArbitration: {
    handleFlowNodeContinuityProviderEvent: (options: {
      readonly sessionId: string;
      readonly event: unknown;
      readonly resolveLiveContinuityRemainingPercentThreshold: (
        session: unknown
      ) => Promise<number>;
    }) => Promise<void>;
    resolveLiveContinuityRemainingPercentThreshold: (
      session: unknown
    ) => Promise<number>;
  };
}

export interface SessionRequestHandlerOptions {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly config: CoreConfig;
  readonly continuityClock?: () => string;
  readonly logger: Logger;
  readonly providerRegistry: ProviderRegistry;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly stateBroadcaster: () => void;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}
