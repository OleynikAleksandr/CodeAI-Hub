import type { CoreConfig } from "../../config";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { BridgeEvent } from "../types";
import type {
  ContinuityLockReason,
  EmitContinuityLockEventOptions,
  FlowNodeContinuityLockContext,
} from "./session-continuity-lock-service";
import type { MessageContentPayload } from "./session-request-handler-event-messages";
import type { PostTurnContextDecision } from "./session-request-handler-resume-lifecycle";

export interface ProviderSessionBindingLike {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
}

export interface ContinuityRootResolutionOptionsLike {
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

export interface SessionRequestHandlerRuntimeCallbacks {
  readonly emitContinuityLockEvent: (
    options: EmitContinuityLockEventOptions
  ) => void;
  readonly emitTurnStateEvent: (options: {
    readonly sessionId: string;
    readonly state: "running" | "idle";
  }) => void;
  readonly finalizeFlowNodeContinuityLock: (options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }) => void;
  readonly finalizeFlowNodeContinuityLockOnBootstrapGate: (options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }) => void;
  readonly getDefaultProviderId: () => string;
  readonly handleFlowNodeContinuityProviderEvent: (
    sessionId: string,
    event: unknown
  ) => Promise<void>;
  readonly handleMessage: (
    sessionId: string,
    payload: MessageContentPayload
  ) => Promise<void>;
  readonly handleProviderEvent: (sessionId: string, event: unknown) => void;
  readonly handleProviderFailure: (
    providerId: string,
    error: unknown,
    sessionId?: string
  ) => void;
  readonly handleTurnCompletedWithFlowNodeArbitration: (
    sessionId: string,
    flowNodeContinuityTask: Promise<void>
  ) => void;
  readonly isFlowNodeRolloverPending: (sessionId: string) => boolean;
  readonly registerFlowNodeContinuityLockContext: (
    context: FlowNodeContinuityLockContext
  ) => FlowNodeContinuityLockContext;
  readonly resolveContinuityRootSessionId: (
    options: ContinuityRootResolutionOptionsLike
  ) => Promise<string>;
  readonly resolveImmediatePostTurnContextDecision: (
    session: Session
  ) => PostTurnContextDecision | null;
  readonly runTurnCompletedArbitration: (sessionId: string) => void;
}

export interface SessionRequestHandlerRuntimeDependencies {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly callbacks: SessionRequestHandlerRuntimeCallbacks;
  readonly config: CoreConfig;
  readonly continuityClock?: () => string;
  readonly continuityRootBySessionId: Map<string, string>;
  readonly logger: Logger;
  readonly providerRegistry: ProviderRegistry;
  readonly providerSessions: Map<string, ProviderSessionBindingLike>;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly stateBroadcaster: () => void;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}
