import type { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { SessionResumeMode } from "../../workspace-runtime/workspace-runtime-types";
import { type BridgeEvent, serializeSession } from "../types";
import type {
  ContinuityRootResolutionOptions,
  CreateAndRegisterSessionOptions,
  DescriptionDialogResolution,
  ProviderSessionBinding,
  ShellSessionCreationResult,
} from "./session-request-handler";

type SessionShellFactoryDependencies = {
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly continuity: SessionContinuityFacade;
  readonly continuityRootBySessionId: Map<string, string>;
  readonly providerSessions: Map<string, ProviderSessionBinding>;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly broadcastSessionBinding: (sessionId: string) => void;
  readonly notifyRuntimeSessionCreated: (session: Session) => void;
  readonly registerInitialSessionLifecycle: (
    session: Session,
    explicitMode?: SessionResumeMode
  ) => void;
  readonly resolveContinuityRootSessionId: (
    options: ContinuityRootResolutionOptions
  ) => Promise<string>;
  readonly resolveDescriptionDialog: (options: {
    readonly session: Session;
    readonly providerSessionId: string;
  }) => Promise<DescriptionDialogResolution>;
  readonly maybePromoteLegacyDescriptionDialogHistory: (options: {
    readonly session: Session;
    readonly dialogSessionId?: string | null;
  }) => void;
  readonly maybeBackfillDescriptionDialogHistory: (options: {
    readonly session: Session;
    readonly providerSessionId: string;
    readonly dialog: DescriptionDialogResolution;
  }) => Promise<void>;
  readonly updateDescriptionSessionRef: (
    session: Session,
    providerSessionId: string
  ) => Promise<void>;
  readonly handleProviderEvent: (sessionId: string, event: unknown) => void;
  readonly updateProviderBinding: (
    sessionId: string,
    providerSessionId: string
  ) => void;
  readonly appendDialogSegmentBoundaryMeta: (options: {
    readonly session: Session;
    readonly workspaceSlug: string;
    readonly stageId: string;
    readonly silent: boolean;
  }) => Promise<void>;
};

export class SessionShellFactory {
  private readonly deps: SessionShellFactoryDependencies;
  constructor(deps: SessionShellFactoryDependencies) {
    this.deps = deps;
  }

  shouldBroadcastCreatedEarly(
    options: CreateAndRegisterSessionOptions
  ): boolean {
    return (
      options.context.stage === "description" &&
      !options.context.providerSessionId
    );
  }

  async createShellSession(
    options: CreateAndRegisterSessionOptions
  ): Promise<ShellSessionCreationResult> {
    const session = this.deps.sessionManager.createSession(
      options.providerId,
      options.workspacePath,
      undefined,
      {
        initiativeSlug: options.context.initiativeSlug,
        stage: options.context.stage,
        runSlug: options.context.runSlug ?? null,
        continuationParentId: options.continuationParentId ?? null,
      }
    );
    const continuityRootSessionId =
      await this.deps.resolveContinuityRootSessionId({
        rootSessionIdOverride: options.rootSessionId ?? null,
        workspaceRoot: options.workspacePath,
        providerId: options.providerId,
        sessionId: session.id,
        context: options.context,
      });
    this.deps.continuityRootBySessionId.set(
      session.id,
      continuityRootSessionId
    );

    this.deps.sessionStorage.register(session, {
      historySessionId: continuityRootSessionId,
    });

    this.deps.notifyRuntimeSessionCreated(session);
    this.deps.registerInitialSessionLifecycle(session, options.resumeMode);

    this.deps.broadcaster({
      type: "session:created",
      payload: serializeSession(session),
    });
    this.deps.broadcastSessionBinding(session.id);

    return { session, continuityRootSessionId };
  }

  handleProviderResolutionError(options: {
    readonly session: Session;
    readonly providerId: string;
    readonly error: string;
  }): void {
    this.deps.sessionManager.markProviderSessionFailed(options.session.id);
    this.deps.sessionStorage.close(
      options.session.id,
      "provider-session-create-failed"
    );
    this.deps.broadcastSessionBinding(options.session.id);
    this.deps.broadcaster({
      type: "session:error",
      payload: {
        sessionId: options.session.id,
        providerId: options.providerId,
        message: options.error,
      },
    });
  }

  async createBoundSession(
    options: CreateAndRegisterSessionOptions,
    providerSessionId: string,
    supportsImmediateBinding: boolean
  ): Promise<Session> {
    const session = this.deps.sessionManager.createSession(
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
    const continuityRootSessionId =
      await this.deps.resolveContinuityRootSessionId({
        rootSessionIdOverride: options.rootSessionId ?? null,
        workspaceRoot: options.workspacePath,
        providerId: options.providerId,
        sessionId: session.id,
        context: options.context,
      });
    this.deps.continuityRootBySessionId.set(
      session.id,
      continuityRootSessionId
    );
    if (!supportsImmediateBinding) {
      this.deps.sessionManager.seedProviderSessionId(
        session.id,
        providerSessionId
      );
    }

    this.deps.sessionStorage.register(session, {
      historySessionId: continuityRootSessionId,
    });

    await this.attachBoundProviderSession({
      options,
      session,
      providerSessionId,
      supportsImmediateBinding,
      continuityRootSessionId,
    });

    this.deps.notifyRuntimeSessionCreated(session);
    this.deps.registerInitialSessionLifecycle(session, options.resumeMode);
    this.deps.broadcaster({
      type: "session:created",
      payload: serializeSession(session),
    });
    this.deps.broadcastSessionBinding(session.id);

    return session;
  }

  async bindShellSession(
    options: CreateAndRegisterSessionOptions,
    shell: ShellSessionCreationResult,
    providerSessionId: string,
    supportsImmediateBinding: boolean
  ): Promise<Session> {
    const session = shell.session;
    if (supportsImmediateBinding) {
      this.deps.sessionManager.updateProviderSessionId(
        session.id,
        providerSessionId
      );
    } else {
      this.deps.sessionManager.seedProviderSessionId(
        session.id,
        providerSessionId
      );
    }

    await this.attachBoundProviderSession({
      options,
      session,
      providerSessionId,
      supportsImmediateBinding,
      continuityRootSessionId: shell.continuityRootSessionId,
    });

    this.deps.broadcastSessionBinding(session.id);
    return session;
  }

  private async attachBoundProviderSession(options: {
    readonly options: CreateAndRegisterSessionOptions;
    readonly session: Session;
    readonly providerSessionId: string;
    readonly supportsImmediateBinding: boolean;
    readonly continuityRootSessionId: string;
  }): Promise<void> {
    const descriptionDialog = await this.deps.resolveDescriptionDialog({
      session: options.session,
      providerSessionId: options.providerSessionId,
    });

    this.deps.maybePromoteLegacyDescriptionDialogHistory({
      session: options.session,
      dialogSessionId: descriptionDialog?.dialogSessionId ?? null,
    });

    await this.deps.maybeBackfillDescriptionDialogHistory({
      session: options.session,
      providerSessionId: options.providerSessionId,
      dialog: descriptionDialog,
    });

    await this.deps.updateDescriptionSessionRef(
      options.session,
      options.providerSessionId
    );

    const sessionId = options.session.id;
    const unsubscribe = options.options.adapter.subscribe(
      options.providerSessionId,
      (event: unknown) => {
        this.deps.handleProviderEvent(sessionId, event);
      }
    );

    this.deps.providerSessions.set(sessionId, {
      providerId: options.options.providerId,
      providerSessionId: options.providerSessionId,
      unsubscribe,
    });

    if (options.supportsImmediateBinding) {
      this.deps.updateProviderBinding(sessionId, options.providerSessionId);
    }

    this.deps.continuity.registerSession({
      session: options.session,
      providerSessionId: options.providerSessionId,
      rootSessionId: options.continuityRootSessionId,
    });
    await this.deps.continuity.ensureTrackedOnOutboundMessage({
      sessionId: options.session.id,
      providerSessionId: options.providerSessionId,
    });

    const workspaceSlug = options.session.initiativeSlug;
    const stageId = options.session.stage;
    if (
      options.options.silent !== true &&
      options.options.continuationParentId &&
      workspaceSlug &&
      stageId
    ) {
      await this.deps.appendDialogSegmentBoundaryMeta({
        session: options.session,
        workspaceSlug,
        stageId,
        silent: false,
      });
    }
  }
}
