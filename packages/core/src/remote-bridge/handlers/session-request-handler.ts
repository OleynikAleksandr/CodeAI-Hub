import { writeFile } from "node:fs/promises";
import path from "node:path";
import { RunStore, resolveRunManifestPath } from "@codeai-hub/initiatives";
import type { CoreConfig } from "../../config";
import type { ProviderRegistry } from "../../provider-registry";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import { serializeSession } from "../types";
import { maybeCreateAutoRun } from "./auto-run-service";
import { detectQuestionnairePath } from "./idea-questionnaire-path-detector";
import { attachPreReadDocuments } from "./idea-questionnaire-pre-read-attacher";
import { autoAttachWorkspaceFiles } from "./workspace-auto-attach";

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

export type SessionRequestHandlerOptions = {
  readonly config: CoreConfig;
  readonly sessionManager: SessionManager;
  readonly providerRegistry: ProviderRegistry;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly logger: Logger;
  readonly broadcaster: (event: unknown) => void;
  readonly stateBroadcaster: () => void;
};

export class SessionRequestHandler {
  private readonly providerSessions = new Map<string, ProviderSessionBinding>();
  private readonly config: CoreConfig;
  private readonly sessionManager: SessionManager;
  private readonly providerRegistry: ProviderRegistry;
  private readonly sessionStorage: UnifiedSessionStorage;
  private readonly logger: Logger;
  private readonly broadcaster: (event: unknown) => void;
  private readonly stateBroadcaster: () => void;
  private static readonly REFINE_PROVIDER_MISMATCH_ERROR =
    "Refine existing run cannot change provider; start a new run to switch provider.";

  constructor(options: SessionRequestHandlerOptions) {
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.providerRegistry = options.providerRegistry;
    this.sessionStorage = options.sessionStorage;
    this.logger = options.logger;
    this.broadcaster = options.broadcaster;
    this.stateBroadcaster = options.stateBroadcaster;
  }

  private async resolveRunBoundProviderContext(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly initiativeSlug: string | null;
    readonly runSlug: string | null;
    readonly requestedProviderSessionId: string | null;
  }): Promise<{
    readonly providerId: string;
    readonly providerSessionId: string | null;
  }> {
    if (!(options.initiativeSlug && options.runSlug)) {
      return {
        providerId: options.providerId,
        providerSessionId: options.requestedProviderSessionId,
      };
    }

    const workspaceRoot = path.resolve(options.workspacePath);
    const runs = new RunStore();
    const manifest = await runs.read(
      workspaceRoot,
      options.initiativeSlug,
      options.runSlug
    );
    if (!manifest) {
      return {
        providerId: options.providerId,
        providerSessionId: options.requestedProviderSessionId,
      };
    }

    const manifestProviderId =
      typeof manifest.providerId === "string" && manifest.providerId.trim()
        ? manifest.providerId.trim()
        : null;
    const manifestProviderSessionId =
      typeof manifest.providerSessionId === "string" &&
      manifest.providerSessionId.trim()
        ? manifest.providerSessionId.trim()
        : null;

    const selectedProviderId =
      manifestProviderId && this.providerRegistry.getAdapter(manifestProviderId)
        ? manifestProviderId
        : options.providerId;

    const providerSessionId =
      options.requestedProviderSessionId ??
      (selectedProviderId === manifestProviderId
        ? manifestProviderSessionId
        : null);

    return { providerId: selectedProviderId, providerSessionId };
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

  private persistRunProviderBinding(options: {
    readonly providerId: string;
    readonly workspaceRoot: string;
    readonly initiativeSlug: string;
    readonly runSlug: string;
    readonly providerSessionId: string;
    readonly supportsImmediateBinding: boolean;
  }): void {
    const runs = new RunStore();
    runs
      .read(options.workspaceRoot, options.initiativeSlug, options.runSlug)
      .then(async (manifest) => {
        if (!manifest) {
          return;
        }
        const manifestPath = resolveRunManifestPath(
          options.workspaceRoot,
          options.initiativeSlug,
          options.runSlug
        );
        const updated = {
          ...manifest,
          providerId: options.providerId,
          ...(options.supportsImmediateBinding
            ? { providerSessionId: options.providerSessionId }
            : {}),
        };
        await writeFile(
          manifestPath,
          `${JSON.stringify(updated, null, 2)}\n`,
          "utf8"
        );
      })
      .catch(() => {
        /* ignore run binding update errors */
      });
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
  }): Promise<void> {
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
      return;
    }

    const { providerSessionId, didResume, supportsImmediateBinding } =
      providerSessionResolution;

    const autoRun =
      options.context.runSlug || didResume
        ? null
        : await maybeCreateAutoRun({
            workspacePath: options.workspacePath,
            initiativeSlug: options.context.initiativeSlug,
            stage: options.context.stage,
            providerId: options.providerId,
            config: this.config,
            logger: this.logger,
          }).catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.warn("Auto-run creation failed", {
              providerId: options.providerId,
              initiativeSlug: options.context.initiativeSlug,
              stage: options.context.stage,
              error: message,
            });
            return null;
          });

    const session = this.sessionManager.createSession(
      options.providerId,
      options.workspacePath,
      supportsImmediateBinding ? providerSessionId : undefined,
      {
        initiativeSlug: options.context.initiativeSlug,
        stage: options.context.stage,
        runSlug: options.context.runSlug ?? autoRun?.runSlug ?? null,
      }
    );

    if (session.initiativeSlug && session.runSlug) {
      this.persistRunProviderBinding({
        providerId: options.providerId,
        workspaceRoot: path.resolve(options.workspacePath),
        initiativeSlug: session.initiativeSlug,
        runSlug: session.runSlug,
        providerSessionId,
        supportsImmediateBinding,
      });
    }

    this.sessionStorage.register(session);

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

    this.broadcaster({
      type: "session:created",
      payload: serializeSession(session),
    });
    this.broadcastSessionBinding(session.id);
  }

  private normalizeProviderId(value?: string): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async canStartRefineExistingRun(options: {
    readonly workspacePath: string;
    readonly initiativeSlug: string | null;
    readonly runSlug: string | null;
    readonly explicitProviderId: string | null;
  }): Promise<boolean> {
    if (
      !(options.explicitProviderId && options.initiativeSlug && options.runSlug)
    ) {
      return true;
    }

    const runs = new RunStore();
    const workspaceRoot = path.resolve(options.workspacePath);
    const manifest = await runs.read(
      workspaceRoot,
      options.initiativeSlug,
      options.runSlug
    );
    const manifestProviderId =
      typeof manifest?.providerId === "string" && manifest.providerId.trim()
        ? manifest.providerId.trim()
        : null;

    if (
      manifestProviderId &&
      manifestProviderId !== options.explicitProviderId
    ) {
      this.broadcaster({
        type: "session:error",
        payload: {
          message: SessionRequestHandler.REFINE_PROVIDER_MISMATCH_ERROR,
        },
      });
      return false;
    }

    return true;
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
    const actualWorkspacePath =
      workspacePath ?? this.config.claudeWorkspacePath ?? process.cwd();

    const canStartRefineExisting = await this.canStartRefineExistingRun({
      workspacePath: actualWorkspacePath,
      initiativeSlug: context?.initiativeSlug ?? null,
      runSlug: context?.runSlug ?? null,
      explicitProviderId: normalizedRequestedProviderId,
    });
    if (!canStartRefineExisting) {
      return;
    }

    const runBound = await this.resolveRunBoundProviderContext({
      providerId: requestedProviderId,
      workspacePath: actualWorkspacePath,
      initiativeSlug: context?.initiativeSlug ?? null,
      runSlug: context?.runSlug ?? null,
      requestedProviderSessionId: context?.providerSessionId ?? null,
    }).catch(() => ({
      providerId: requestedProviderId,
      providerSessionId: context?.providerSessionId ?? null,
    }));
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
    const extracted = this.extractMessageContentAndTurnOptions(messagePayload);
    if (!extracted) {
      this.logger.warn("Received invalid message payload", { sessionId });
      return;
    }

    const { content, turnOptions } = extracted;
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      this.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      return;
    }

    const questionnairePath = detectQuestionnairePath(content);
    const preReadResult = questionnairePath
      ? await attachPreReadDocuments(session.workspacePath, questionnairePath)
      : { contentPrefix: "", attachedPaths: [] };

    if (preReadResult.attachedPaths.length > 0) {
      this.logger.info("Auto-attached questionnaire pre-read documents", {
        sessionId,
        attachedPaths: preReadResult.attachedPaths,
      });
    }

    const providerContentResult = await autoAttachWorkspaceFiles(
      session.workspacePath,
      content
    );
    if (providerContentResult.didAttach) {
      this.logger.info("Auto-attached workspace files to provider message", {
        sessionId,
        attachedPaths: providerContentResult.attachedPaths,
      });
    }
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
      this.logger.warn("Provider binding or adapter missing for session", {
        sessionId,
      });
      return;
    }

    try {
      const providerContent = preReadResult.contentPrefix
        ? `${preReadResult.contentPrefix}\n${providerContentResult.content}`
        : providerContentResult.content;
      await adapter.sendMessage(
        binding.providerSessionId,
        providerContent,
        turnOptions
      );
    } catch (error) {
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

    if (session.initiativeSlug && session.runSlug) {
      const workspaceRoot = path.resolve(session.workspacePath);
      const initiativeSlug = session.initiativeSlug;
      const runSlug = session.runSlug;
      const runs = new RunStore();
      runs
        .read(workspaceRoot, initiativeSlug, runSlug)
        .then(async (manifest) => {
          if (!manifest) {
            return;
          }
          const manifestPath = resolveRunManifestPath(
            workspaceRoot,
            initiativeSlug,
            runSlug
          );
          const updated = {
            ...manifest,
            providerId: session.providerId,
            providerSessionId,
          };
          await writeFile(
            manifestPath,
            `${JSON.stringify(updated, null, 2)}\n`,
            "utf8"
          );
        })
        .catch(() => {
          /* ignore run providerSessionId persistence errors */
        });
    }
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

  private getDefaultProviderId(): string {
    return this.providerRegistry.listProviders()[0]?.id ?? "claudeCodeCli";
  }
}
