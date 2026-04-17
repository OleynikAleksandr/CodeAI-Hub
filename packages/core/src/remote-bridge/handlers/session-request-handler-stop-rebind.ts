import type { ProviderRegistry } from "../../provider-registry";
import type { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { resolveProviderSessionId } from "./session-provider-session-resolver";
import type { DescriptionDialogResolution } from "./session-request-handler";
import type { ProviderSessionBindingLike } from "./session-request-handler-runtime-types";

type ProviderAdapter = NonNullable<ReturnType<ProviderRegistry["getAdapter"]>>;

interface SessionRequestHandlerStopRebindOptions {
  readonly broadcastSessionBinding: (sessionId: string) => void;
  readonly continuity: SessionContinuityFacade;
  readonly continuityRootBySessionId: Map<string, string>;
  readonly handleProviderEvent: (sessionId: string, event: unknown) => void;
  readonly logger: Logger;
  readonly maybeBackfillDescriptionDialogHistory: (options: {
    readonly dialog: DescriptionDialogResolution;
    readonly providerSessionId: string;
    readonly session: Session;
  }) => Promise<void>;
  readonly maybePromoteLegacyDescriptionDialogHistory: (options: {
    readonly dialogSessionId?: string | null;
    readonly session: Session;
  }) => void;
  readonly onProviderFailure: (
    providerId: string,
    error: unknown,
    sessionId?: string
  ) => void;
  readonly providerRegistry: ProviderRegistry;
  readonly providerSessions: Map<string, ProviderSessionBindingLike>;
  readonly resolveDescriptionDialog: (options: {
    readonly providerSessionId: string;
    readonly session: Session;
  }) => Promise<DescriptionDialogResolution>;
  readonly sessionManager: SessionManager;
  readonly updateDescriptionSessionRef: (
    session: Session,
    providerSessionId: string
  ) => Promise<void>;
  readonly updateProviderBinding: (
    sessionId: string,
    providerSessionId: string
  ) => void;
}

export class SessionRequestHandlerStopRebind {
  private readonly deps: SessionRequestHandlerStopRebindOptions;
  private readonly pendingRebinds = new Map<string, Promise<boolean>>();

  constructor(options: SessionRequestHandlerStopRebindOptions) {
    this.deps = options;
  }

  async ensureSessionReadyForSend(session: Session): Promise<boolean> {
    const alreadyReady = !this.deps.sessionManager.hasStopInvalidatedBinding(
      session.id
    );
    this.deps.logger.info("stopdiag_rebind_gate", {
      sessionId: session.id,
      providerId: session.providerId,
      stopInvalidated: !alreadyReady,
      providerSessionStatus: session.providerSessionStatus,
      providerSessionId: session.providerSessionId ?? null,
    });
    if (alreadyReady) {
      return true;
    }

    const pendingRebind = this.pendingRebinds.get(session.id);
    if (pendingRebind) {
      this.deps.logger.info("stopdiag_rebind_await_existing", {
        sessionId: session.id,
      });
      return await pendingRebind;
    }

    const rebindTask = this.performRebind(session).finally(() => {
      this.pendingRebinds.delete(session.id);
    });
    this.pendingRebinds.set(session.id, rebindTask);
    return await rebindTask;
  }

  private async performRebind(session: Session): Promise<boolean> {
    const adapter = this.deps.providerRegistry.getAdapter(session.providerId);
    if (!adapter) {
      this.deps.logger.info("stopdiag_rebind_no_adapter", {
        sessionId: session.id,
        providerId: session.providerId,
      });
      this.deps.onProviderFailure(
        session.providerId,
        new Error(`Provider ${session.providerId} unavailable`),
        session.id
      );
      return false;
    }

    this.deps.logger.info("stopdiag_rebind_begin", {
      sessionId: session.id,
      providerId: session.providerId,
      stage: session.stage ?? null,
      continuityRoot:
        this.deps.continuityRootBySessionId.get(session.id) ?? session.id,
    });

    const providerSessionResolution = await resolveProviderSessionId({
      adapter,
      providerId: session.providerId,
      requestedProviderSessionId: null,
      workspacePath: session.workspacePath,
    });
    if ("error" in providerSessionResolution) {
      this.deps.logger.info("stopdiag_rebind_resolve_error", {
        sessionId: session.id,
        providerId: session.providerId,
        error: providerSessionResolution.error,
      });
      this.deps.onProviderFailure(
        session.providerId,
        new Error(providerSessionResolution.error),
        session.id
      );
      return false;
    }

    const { providerSessionId, supportsImmediateBinding } =
      providerSessionResolution;

    this.deps.logger.info("stopdiag_rebind_create_done", {
      sessionId: session.id,
      providerId: session.providerId,
      providerSessionId,
      supportsImmediateBinding,
    });

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
    this.deps.logger.info("stopdiag_rebind_seed_done", {
      sessionId: session.id,
      providerSessionId,
      supportsImmediateBinding,
      providerSessionStatusAfter: session.providerSessionStatus,
    });

    try {
      await this.attachReboundProviderSession({
        adapter,
        continuityRootSessionId:
          this.deps.continuityRootBySessionId.get(session.id) ?? session.id,
        providerSessionId,
        session,
        supportsImmediateBinding,
      });
      this.deps.broadcastSessionBinding(session.id);
      this.deps.logger.info("stopdiag_rebind_attach_done", {
        sessionId: session.id,
        providerSessionId,
        providerSessionStatusAfter: session.providerSessionStatus,
      });
      return true;
    } catch (error) {
      this.deps.logger.info("stopdiag_rebind_attach_error", {
        sessionId: session.id,
        providerSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.deps.sessionManager.invalidateProviderBinding(session.id);
      this.deps.broadcastSessionBinding(session.id);
      try {
        await adapter.closeSession(providerSessionId);
      } catch {
        // Best-effort cleanup only; the bind failure remains the user-visible error.
      }
      this.deps.onProviderFailure(session.providerId, error, session.id);
      return false;
    }
  }

  private async attachReboundProviderSession(options: {
    readonly adapter: ProviderAdapter;
    readonly continuityRootSessionId: string;
    readonly providerSessionId: string;
    readonly session: Session;
    readonly supportsImmediateBinding: boolean;
  }): Promise<void> {
    const descriptionDialog = await this.deps.resolveDescriptionDialog({
      providerSessionId: options.providerSessionId,
      session: options.session,
    });

    this.deps.maybePromoteLegacyDescriptionDialogHistory({
      dialogSessionId: descriptionDialog?.dialogSessionId ?? null,
      session: options.session,
    });
    await this.deps.maybeBackfillDescriptionDialogHistory({
      dialog: descriptionDialog,
      providerSessionId: options.providerSessionId,
      session: options.session,
    });
    await this.deps.updateDescriptionSessionRef(
      options.session,
      options.providerSessionId
    );

    this.deps.providerSessions.get(options.session.id)?.unsubscribe();

    const unsubscribe = options.adapter.subscribe(
      options.providerSessionId,
      (event: unknown) => {
        this.deps.handleProviderEvent(options.session.id, event);
      }
    );

    this.deps.providerSessions.set(options.session.id, {
      providerId: options.session.providerId,
      providerSessionId: options.providerSessionId,
      unsubscribe,
    });

    if (options.supportsImmediateBinding) {
      this.deps.updateProviderBinding(
        options.session.id,
        options.providerSessionId
      );
    }

    this.deps.continuity.registerSession({
      providerSessionId: options.providerSessionId,
      rootSessionId: options.continuityRootSessionId,
      session: options.session,
    });
    this.deps.continuity.updateProviderSessionId(
      options.session.id,
      options.providerSessionId
    );
  }
}
