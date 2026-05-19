import crypto from "node:crypto";
import {
  type ClaudeNativeRequestCaptureOptions,
  ClaudeNativeRequestCaptureService,
} from "../diagnostics/claude-native-request-capture-service";
import { SDKInstaller } from "../installer/sdk-installer";
import { SDKMessageProcessor } from "../messaging/message-processor";
import { ClaudeSessionStaleBindingError } from "../provider/claude-session-stale-binding-error";
import { ClaudeSDKManager } from "../sdk/claude-sdk-manager";
import { KimiClaudeCodeSessionStaleBindingError } from "../session/kimi-claude-code-session-lifecycle";
import { SDKSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type {
  ClaudeInstallerPaths,
  ClaudeUsageLimitsFacadeBridge,
  ClaudeUsageLimitsStreamPayload,
  ClaudeWorkspaceOptions,
  ModuleReporter,
} from "../types";
import {
  buildKimiClaudeCodeRuntimeProfile,
  KIMI_CLAUDE_CODE_DEFAULT_PROJECT_SLUG,
  KIMI_CLAUDE_CODE_MODEL_ID,
} from "./kimi-claude-code-runtime-profile";
import { KimiClaudeCodeSDKAuthManager } from "./kimi-claude-code-sdk-auth-manager";

export type KimiClaudeCodeSessionListener = (payload: unknown) => void;

export interface KimiClaudeCodeWorkspaceOptions {
  readonly defaultModel?: string;
  readonly kimiClaudeProjectSlug?: string;
  readonly settingsPath?: string;
  readonly workspacePath: string;
}

export type KimiClaudeCodeUsageLimitsFacadeBridge =
  ClaudeUsageLimitsFacadeBridge;

export interface KimiClaudeCodeProviderAdapterOptions {
  readonly enableDebugStreams?: boolean;
  readonly installerPaths: ClaudeInstallerPaths;
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: KimiClaudeCodeUsageLimitsFacadeBridge;
  readonly workspace: KimiClaudeCodeWorkspaceOptions;
}

export class KimiClaudeCodeProviderAdapter {
  private readonly authManager: KimiClaudeCodeSDKAuthManager;
  private readonly listeners = new Map<
    string,
    Set<KimiClaudeCodeSessionListener>
  >();
  private readonly pendingEvents = new Map<string, unknown[]>();
  private readonly nativeRequestCaptureService: ClaudeNativeRequestCaptureService;
  private readonly sessionIdAliases = new Map<string, string>();
  private readonly sdkManager: ClaudeSDKManager;
  private readonly usageLimitsFacade?: KimiClaudeCodeUsageLimitsFacadeBridge;

  constructor(options: KimiClaudeCodeProviderAdapterOptions) {
    this.usageLimitsFacade = options.usageLimitsFacade;
    const projectSlug =
      options.workspace.kimiClaudeProjectSlug ??
      KIMI_CLAUDE_CODE_DEFAULT_PROJECT_SLUG;
    const sdkWorkspace = this.buildSDKWorkspace(options.workspace, projectSlug);
    const runtimeProfile = buildKimiClaudeCodeRuntimeProfile({ projectSlug });
    const installer = new SDKInstaller(options.installerPaths, {
      logger: options.reporter,
    });
    this.authManager = new KimiClaudeCodeSDKAuthManager({
      reporter: options.reporter,
    });
    const sessions = new SDKSessionManager();
    const processor = new SDKMessageProcessor(sessions, {
      projectPath: runtimeProfile.projectPath,
      providerId: "kimiClaudeCode",
      reporter: options.reporter,
      usageLimitsFacade: options.usageLimitsFacade,
    });
    this.sdkManager = new ClaudeSDKManager({
      authManager: this.authManager,
      enableDebugStreams: options.enableDebugStreams,
      installer,
      processor,
      reporter: options.reporter,
      runtimeProfile,
      sessions,
      workspace: sdkWorkspace,
    });
    this.nativeRequestCaptureService = new ClaudeNativeRequestCaptureService({
      authManager: this.authManager,
      installer,
      workspace: sdkWorkspace,
    });
  }

  async initialize(): Promise<void> {
    await this.sdkManager.initialize();
    await this.authManager.ensureProviderHomeSessionBootstrap();
  }

  async createSession(workspacePath?: string): Promise<string> {
    const sessionId = await this.sdkManager.createSession(workspacePath);
    const session = this.sdkManager.getSession(sessionId);
    if (session) {
      this.bindSessionEvents(session);
    }
    return sessionId;
  }

  async resumeSession(
    sessionId: string,
    workspacePath?: string
  ): Promise<string> {
    const resumedId = await this.sdkManager.resumeSession(
      sessionId,
      workspacePath
    );
    const session = this.sdkManager.getSession(resumedId);
    if (session) {
      this.bindSessionEvents(session);
    }
    return resumedId;
  }

  async refreshUsageLimits(params: {
    readonly broadcast: (event: unknown) => void;
    readonly providerSessionId: string;
    readonly runtimeSessionId: string;
    readonly workspacePath: string;
  }): Promise<void> {
    const payload = await this.usageLimitsFacade
      ?.readStreamPayload({
        force: true,
        providerSessionId: params.providerSessionId,
        runtimeSessionId: params.runtimeSessionId,
        workspacePath: params.workspacePath,
      })
      .catch((): ClaudeUsageLimitsStreamPayload | null => null);
    if (!payload?.usageLimits) {
      return;
    }
    params.broadcast({
      data: payload.data,
      providerScopeKey: payload.providerScopeKey,
      timestamp: new Date().toISOString(),
      usageLimits: payload.usageLimits,
      uuid: `${crypto.randomUUID()}::usage_limits`,
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.sdkManager.closeSession(sessionId);
    this.listeners.delete(sessionId);
  }

  async captureNativeRequest(
    options: ClaudeNativeRequestCaptureOptions
  ): Promise<void> {
    await this.nativeRequestCaptureService.captureNativeRequest(options);
  }

  async sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.sdkManager.sendMessage(sessionId, content, turnOptions);
    } catch (error) {
      if (error instanceof ClaudeSessionStaleBindingError) {
        throw new KimiClaudeCodeSessionStaleBindingError(sessionId);
      }
      throw error;
    }
  }

  subscribe(
    sessionId: string,
    listener: KimiClaudeCodeSessionListener
  ): () => void {
    const resolvedId = this.resolveSessionAlias(sessionId);
    const bucket =
      this.listeners.get(resolvedId) ??
      new Set<KimiClaudeCodeSessionListener>();
    bucket.add(listener);
    this.listeners.set(resolvedId, bucket);
    this.flushPendingEvents(resolvedId);
    if (resolvedId !== sessionId) {
      this.sessionIdAliases.set(sessionId, resolvedId);
      this.flushPendingEvents(sessionId);
    }
    return () => {
      const target = this.listeners.get(resolvedId);
      if (!target) {
        return;
      }
      target.delete(listener);
      if (target.size === 0) {
        this.listeners.delete(resolvedId);
      }
    };
  }

  private buildSDKWorkspace(
    workspace: KimiClaudeCodeWorkspaceOptions,
    projectSlug: string
  ): ClaudeWorkspaceOptions {
    return {
      claudeProjectSlug: projectSlug,
      defaultModel: workspace.defaultModel ?? KIMI_CLAUDE_CODE_MODEL_ID,
      settingsPath: workspace.settingsPath,
      workspacePath: workspace.workspacePath,
    };
  }

  private bindSessionEvents(session: ActiveSession): void {
    session.eventEmitter.on("message", (payload: unknown) => {
      this.dispatchMessage(session.sessionId, payload);
    });
    session.eventEmitter.on("error", (payload: unknown) => {
      this.dispatchMessage(session.sessionId, {
        payload,
        provider: "kimiClaudeCode",
        type: "error",
      });
    });
    session.eventEmitter.on("sessionIdChanged", (payload) => {
      if (payload?.oldId && payload?.newId) {
        this.reassignListeners(payload.oldId, payload.newId);
        this.sessionIdAliases.set(payload.oldId, payload.newId);
      }
      this.dispatchMessage(payload?.newId ?? session.sessionId, {
        payload,
        type: "sessionIdChanged",
      });
    });
  }

  private dispatchMessage(sessionId: string, payload: unknown): void {
    const resolvedId = this.resolveSessionAlias(sessionId);
    const target = this.listeners.get(resolvedId);
    if (!target) {
      const queue = this.pendingEvents.get(resolvedId) ?? [];
      queue.push(payload);
      this.pendingEvents.set(resolvedId, queue);
      return;
    }
    for (const listener of target) {
      listener(payload);
    }
  }

  private reassignListeners(oldId: string, newId: string): void {
    if (oldId === newId) {
      return;
    }
    this.rebindPendingEvents(oldId, newId);
    this.rebindSessionAliases(oldId, newId);
    const set = this.listeners.get(oldId);
    if (set) {
      this.listeners.delete(oldId);
      const destination =
        this.listeners.get(newId) ?? new Set<KimiClaudeCodeSessionListener>();
      for (const listener of set) {
        destination.add(listener);
      }
      this.listeners.set(newId, destination);
    }
    this.flushPendingEvents(newId);
  }

  private rebindPendingEvents(oldId: string, newId: string): void {
    const queued = this.pendingEvents.get(oldId);
    if (!queued?.length) {
      return;
    }
    this.pendingEvents.delete(oldId);
    const destination = this.pendingEvents.get(newId) ?? [];
    destination.push(...queued);
    this.pendingEvents.set(newId, destination);
  }

  private rebindSessionAliases(oldId: string, newId: string): void {
    for (const [alias, target] of this.sessionIdAliases.entries()) {
      if (target === oldId) {
        this.sessionIdAliases.set(alias, newId);
      }
    }
  }

  private resolveSessionAlias(sessionId: string): string {
    let current = sessionId;
    const visited = new Set<string>();
    while (this.sessionIdAliases.has(current) && !visited.has(current)) {
      visited.add(current);
      current = this.sessionIdAliases.get(current) ?? current;
    }
    return current;
  }

  private flushPendingEvents(sessionId: string): void {
    const events = this.pendingEvents.get(sessionId);
    const listeners = this.listeners.get(sessionId);
    if (!(events?.length && listeners?.size)) {
      return;
    }
    this.pendingEvents.delete(sessionId);
    for (const event of events) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }
}
