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
