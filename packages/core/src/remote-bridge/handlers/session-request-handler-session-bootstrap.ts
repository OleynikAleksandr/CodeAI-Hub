import type { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { BridgeEvent } from "../types";
import { resolveProviderSessionId } from "./session-provider-session-resolver";
import type {
  ContinuityRootResolutionOptions,
  CreateAndRegisterSessionOptions,
  DescriptionDialogResolution,
  ProviderSessionBinding,
} from "./session-request-handler";
import type { SessionRequestHandlerResumeLifecycle } from "./session-request-handler-resume-lifecycle";
import { SessionShellFactory } from "./session-shell-factory";

interface SessionRequestHandlerSessionBootstrapDependencies {
  readonly appendDialogSegmentBoundaryMeta: (options: {
    readonly session: Session;
    readonly workspaceSlug: string;
    readonly stageId: string;
    readonly silent: boolean;
  }) => Promise<void>;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly broadcastSessionBinding: (sessionId: string) => void;
  readonly continuity: SessionContinuityFacade;
  readonly continuityRootBySessionId: Map<string, string>;
  readonly handleProviderEvent: (sessionId: string, event: unknown) => void;
  readonly maybeBackfillDescriptionDialogHistory: (options: {
    readonly session: Session;
    readonly providerSessionId: string;
    readonly dialog: DescriptionDialogResolution;
  }) => Promise<void>;
  readonly maybePromoteLegacyDescriptionDialogHistory: (options: {
    readonly session: Session;
    readonly dialogSessionId?: string | null;
  }) => void;
  readonly providerSessions: Map<string, ProviderSessionBinding>;
  readonly resolveContinuityRootSessionId: (
    options: ContinuityRootResolutionOptions
  ) => Promise<string>;
  readonly resolveDescriptionDialog: (options: {
    readonly session: Session;
    readonly providerSessionId: string;
  }) => Promise<DescriptionDialogResolution>;
  readonly resumeLifecycle: SessionRequestHandlerResumeLifecycle;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly updateDescriptionSessionRef: (
    session: Session,
    providerSessionId: string
  ) => Promise<void>;
  readonly updateProviderBinding: (
    sessionId: string,
    providerSessionId: string
  ) => void;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}

export class SessionRequestHandlerSessionBootstrap {
  private readonly deps: SessionRequestHandlerSessionBootstrapDependencies;
  private readonly sessionShellFactory: SessionShellFactory;

  constructor(deps: SessionRequestHandlerSessionBootstrapDependencies) {
    this.deps = deps;
    this.sessionShellFactory = new SessionShellFactory({
      sessionManager: this.deps.sessionManager,
      sessionStorage: this.deps.sessionStorage,
      continuity: this.deps.continuity,
      continuityRootBySessionId: this.deps.continuityRootBySessionId,
      providerSessions: this.deps.providerSessions,
      broadcaster: this.deps.broadcaster,
      broadcastSessionBinding: (sessionId) =>
        this.deps.broadcastSessionBinding(sessionId),
      notifyRuntimeSessionCreated: (session) =>
        this.notifyRuntimeSessionCreated(session),
      registerInitialSessionLifecycle: (session, explicitMode) =>
        this.deps.resumeLifecycle.registerInitialSessionLifecycle(
          session,
          explicitMode
        ),
      resolveContinuityRootSessionId: (options) =>
        this.deps.resolveContinuityRootSessionId(options),
      resolveDescriptionDialog: (options) =>
        this.deps.resolveDescriptionDialog(options),
      maybePromoteLegacyDescriptionDialogHistory: (options) =>
        this.deps.maybePromoteLegacyDescriptionDialogHistory(options),
      maybeBackfillDescriptionDialogHistory: (options) =>
        this.deps.maybeBackfillDescriptionDialogHistory(options),
      updateDescriptionSessionRef: (session, providerSessionId) =>
        this.deps.updateDescriptionSessionRef(session, providerSessionId),
      handleProviderEvent: (sessionId, event) =>
        this.deps.handleProviderEvent(sessionId, event),
      updateProviderBinding: (sessionId, providerSessionId) =>
        this.deps.updateProviderBinding(sessionId, providerSessionId),
      appendDialogSegmentBoundaryMeta: (options) =>
        this.deps.appendDialogSegmentBoundaryMeta(options),
    });
  }

  resolveRunBoundProviderContext(options: {
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

  async createAndRegisterSession(
    options: CreateAndRegisterSessionOptions
  ): Promise<Session | null> {
    const shell = this.sessionShellFactory.shouldBroadcastCreatedEarly(options)
      ? await this.sessionShellFactory.createShellSession(options)
      : null;

    const providerSessionResolution = await resolveProviderSessionId({
      adapter: options.adapter,
      providerId: options.providerId,
      workspacePath: options.workspacePath,
      requestedProviderSessionId: options.context.providerSessionId,
    });
    if ("error" in providerSessionResolution) {
      if (shell) {
        this.sessionShellFactory.handleProviderResolutionError({
          session: shell.session,
          providerId: options.providerId,
          error: providerSessionResolution.error,
        });
        return shell.session;
      }
      this.deps.broadcaster({
        type: "session:error",
        payload: { message: providerSessionResolution.error },
      });
      return null;
    }

    const { providerSessionId, supportsImmediateBinding } =
      providerSessionResolution;

    if (shell) {
      return await this.sessionShellFactory.bindShellSession(
        options,
        shell,
        providerSessionId,
        supportsImmediateBinding
      );
    }

    return await this.sessionShellFactory.createBoundSession(
      options,
      providerSessionId,
      supportsImmediateBinding
    );
  }
  private notifyRuntimeSessionCreated(session: Session): void {
    this.deps.workspaceRuntime?.notifySessionCreated(
      {
        workspaceRoot: session.workspacePath,
        nodeId: session.stage ?? "session",
        sessionId: session.id,
      },
      {
        nodeId: session.stage ?? "session",
        providerId: session.providerId,
        providerSessionId: session.providerSessionId ?? undefined,
        bindingStatus: session.providerSessionStatus,
      }
    );
  }
}
