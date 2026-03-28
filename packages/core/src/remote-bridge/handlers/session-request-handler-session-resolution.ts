import path from "node:path";
import type { ProviderRegistry } from "../../provider-registry";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { type BridgeEvent, serializeSession } from "../types";
import type { SessionRequestHandlerSessionBootstrap } from "./session-request-handler-session-bootstrap";

interface SessionRequestHandlerSessionResolutionDependencies {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly broadcastSessionBinding: (sessionId: string) => void;
  readonly getDefaultProviderId: () => string;
  readonly handleMessage: (sessionId: string, payload: string) => Promise<void>;
  readonly handleProviderFailure: (
    providerId: string,
    error: unknown,
    sessionId?: string
  ) => void;
  readonly logger: Logger;
  readonly providerRegistry: ProviderRegistry;
  readonly sessionBootstrap: SessionRequestHandlerSessionBootstrap;
  readonly sessionManager: SessionManager;
  readonly workspacePathOverride?: string;
}

export class SessionRequestHandlerSessionResolution {
  private readonly deps: SessionRequestHandlerSessionResolutionDependencies;

  constructor(deps: SessionRequestHandlerSessionResolutionDependencies) {
    this.deps = deps;
  }

  async createContinuitySession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly context: {
      readonly initiativeSlug: string | null;
      readonly stage: string | null;
    };
    readonly rootSessionId: string;
  }): Promise<Session | null> {
    const adapter = this.deps.providerRegistry.getAdapter(options.providerId);
    if (!adapter) {
      this.deps.logger.warn(
        "Continuity session creation failed: provider missing",
        {
          providerId: options.providerId,
        }
      );
      return null;
    }
    try {
      return await this.deps.sessionBootstrap.createAndRegisterSession({
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
      this.deps.handleProviderFailure(options.providerId, error);
      return null;
    }
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
    const requestedProviderId =
      this.normalizeProviderId(providerId) ?? this.deps.getDefaultProviderId();
    const actualWorkspacePath = this.resolveWorkspacePath(workspacePath);
    const runBound = this.deps.sessionBootstrap.resolveRunBoundProviderContext({
      providerId: requestedProviderId,
      workspacePath: actualWorkspacePath,
      initiativeSlug: context?.initiativeSlug ?? null,
      runSlug: context?.runSlug ?? null,
      requestedProviderSessionId: context?.providerSessionId ?? null,
    });
    if (
      this.tryReuseExistingResumeSession({
        providerId: runBound.providerId,
        workspacePath: actualWorkspacePath,
        providerSessionId: runBound.providerSessionId,
        context: {
          initiativeSlug: context?.initiativeSlug ?? null,
          stage: context?.stage ?? null,
          runSlug: context?.runSlug ?? null,
        },
      })
    ) {
      return;
    }
    const adapter = this.deps.providerRegistry.getAdapter(runBound.providerId);
    if (!adapter) {
      this.deps.broadcaster({
        type: "session:error",
        payload: { message: `Provider ${runBound.providerId} unavailable` },
      });
      return;
    }
    try {
      await this.deps.sessionBootstrap.createAndRegisterSession({
        providerId: runBound.providerId,
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
      this.deps.handleProviderFailure(runBound.providerId, error);
    }
  }

  async handleDialogSend(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly dialogId: string;
    readonly content: string;
  }): Promise<
    { readonly ok: true } | { readonly ok: false; readonly error: string }
  > {
    const chains = await SessionContinuityFacade.readWorkspaceChains({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    });
    const chain = chains.find(
      (candidate) =>
        (candidate.dialogId ?? candidate.rootSessionId) === options.dialogId
    );
    if (!chain) {
      return { ok: false, error: "Dialog chain not found" };
    }
    const last = chain.segments.at(-1) ?? null;
    if (!last) {
      return { ok: false, error: "Dialog has no segments" };
    }
    const adapter = this.deps.providerRegistry.getAdapter(last.providerId);
    if (!adapter) {
      return { ok: false, error: `Provider ${last.providerId} unavailable` };
    }
    const existingSession = this.deps.sessionManager
      .getSessionsByWorkspacePath(options.workspaceRoot)
      .find(
        (candidate) =>
          candidate.providerId === last.providerId &&
          candidate.providerSessionId === last.providerSessionId
      );
    const resolvedSession =
      existingSession ??
      (await this.deps.sessionBootstrap.createAndRegisterSession({
        providerId: last.providerId,
        workspacePath: options.workspaceRoot,
        adapter,
        context: {
          initiativeSlug: options.workspaceSlug,
          stage: chain.stage === "unknown" ? null : chain.stage,
          runSlug: this.inferRunSlugFromDialogId(options.dialogId),
          providerSessionId: last.providerSessionId,
        },
        rootSessionId: options.dialogId,
      }));
    if (!resolvedSession) {
      return { ok: false, error: "Failed to resume dialog session" };
    }
    await this.deps.handleMessage(resolvedSession.id, options.content);
    return { ok: true };
  }

  private normalizeProviderId(value?: string): string | null {
    return this.normalizeNullableToken(value);
  }

  private resolveWorkspacePath(workspacePath?: string): string {
    const trimmed = this.normalizeNullableToken(workspacePath);
    const cwdPath = process.cwd();
    const override = this.deps.workspacePathOverride;
    if (
      override &&
      (!trimmed || path.resolve(trimmed) === path.resolve(cwdPath))
    ) {
      return override;
    }
    return trimmed ?? override ?? cwdPath;
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

  private tryReuseExistingResumeSession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly providerSessionId: string | null;
    readonly context?: {
      readonly initiativeSlug?: string | null;
      readonly stage?: string | null;
      readonly runSlug?: string | null;
    };
  }): boolean {
    const providerSessionId = this.normalizeNullableToken(
      options.providerSessionId
    );
    if (!providerSessionId) {
      return false;
    }
    for (const session of this.deps.sessionManager.listSessions()) {
      if (
        session.providerId === options.providerId &&
        session.workspacePath === options.workspacePath &&
        session.providerSessionId === providerSessionId &&
        (this.normalizeNullableToken(options.context?.stage) === null ||
          session.stage ===
            this.normalizeNullableToken(options.context?.stage)) &&
        (this.normalizeNullableToken(options.context?.runSlug) === null ||
          session.runSlug ===
            this.normalizeNullableToken(options.context?.runSlug)) &&
        (this.normalizeNullableToken(options.context?.initiativeSlug) ===
          null ||
          session.initiativeSlug ===
            this.normalizeNullableToken(options.context?.initiativeSlug))
      ) {
        this.deps.broadcaster({
          type: "session:created",
          payload: serializeSession(session),
        });
        this.deps.broadcastSessionBinding(session.id);
        return true;
      }
    }
    return false;
  }

  private inferRunSlugFromDialogId(dialogId: string): string | null {
    const trimmed = dialogId.trim().toLowerCase();
    return trimmed.endsWith("__collector") || trimmed.endsWith("-collector")
      ? "collector"
      : null;
  }
}
