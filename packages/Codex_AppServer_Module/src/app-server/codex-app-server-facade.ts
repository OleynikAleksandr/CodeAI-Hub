import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { CodexSessionStaleBindingError } from "../provider/codex-session-stale-binding-error";
import {
  CODEX_APPLIED_TURN_CONFIG_KEY,
  type CodexModuleOptions,
  type CodexReasoningSummaryMode,
  type CodexTurnOptions,
  type CodexUsageLimitsStreamPayload,
} from "../types";
import {
  type AppServerSessionState,
  CodexAppServerEventRouter,
} from "./codex-app-server-event-router";
import { CodexAppServerProcess } from "./process/codex-app-server-process";

const DEFAULT_REASONING_SUMMARY: CodexReasoningSummaryMode = "detailed";
const DEFAULT_REASONING_SUMMARY_ENABLED = true;
const DEFAULT_SETTINGS_PATH = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const resolveSettingsPath = (): string =>
  asString(process.env.CODEX_SETTINGS_PATH) ??
  asString(process.env.CLAUDE_SETTINGS_PATH) ??
  DEFAULT_SETTINGS_PATH;

const resolveReasoningSummaryEnabled = (): boolean => {
  try {
    const parsed = JSON.parse(
      readFileSync(resolveSettingsPath(), "utf8")
    ) as unknown;
    if (!(isRecord(parsed) && isRecord(parsed.providers))) {
      return DEFAULT_REASONING_SUMMARY_ENABLED;
    }
    const codex = parsed.providers.codex;
    if (!isRecord(codex)) {
      return DEFAULT_REASONING_SUMMARY_ENABLED;
    }
    if (typeof codex.reasoningSummaryEnabled === "boolean") {
      return codex.reasoningSummaryEnabled;
    }
    if (typeof codex.thinkingDisplaySyncEnabled === "boolean") {
      return codex.thinkingDisplaySyncEnabled;
    }
    return DEFAULT_REASONING_SUMMARY_ENABLED;
  } catch {
    return DEFAULT_REASONING_SUMMARY_ENABLED;
  }
};

const resolveTurnReasoningSummaryMode = (): CodexReasoningSummaryMode =>
  resolveReasoningSummaryEnabled() ? DEFAULT_REASONING_SUMMARY : "none";

export class CodexAppServerFacade {
  private readonly eventRouter: CodexAppServerEventRouter;
  private readonly process: CodexAppServerProcess;
  private readonly sessions = new Map<string, AppServerSessionState>();
  // Thread ids for which this facade has actually completed a handshake
  // (thread/start or thread/resume) against the current app-server child
  // process. After Core restart the app-server child dies with us, so a
  // paper-binding resolved by the continuity materializer can point at a
  // thread id that the facade state map is willing to ensureSessionState
  // for (subscribe/listener wiring), but that the app-server itself has
  // never seen. sendMessage consults this set to decide whether to raise
  // CodexSessionStaleBindingError so the Core dispatch layer can run its
  // one-shot invalidate + ensureSessionReadyForSend + resend recovery.
  private readonly handshakedThreadIds = new Set<string>();
  private readonly workspace: CodexModuleOptions["workspace"];

  constructor(options: CodexModuleOptions) {
    this.workspace = options.workspace;
    this.process = new CodexAppServerProcess(options.reporter);
    this.eventRouter = new CodexAppServerEventRouter({
      emit: (threadId, payload) => this.emit(threadId, payload),
      ensureSessionState: (threadId) => this.ensureSessionState(threadId),
      listThreadIds: () => this.sessions.keys(),
    });
    this.process.onNotification((notification) => {
      this.eventRouter.handleNotification(
        notification.method,
        notification.params
      );
    });
  }

  async initialize(): Promise<void> {
    await this.process.start();
  }

  async createSession(workspacePath?: string): Promise<string> {
    const response = await this.process.request<Record<string, unknown>>(
      "thread/start",
      {
        cwd: workspacePath ?? this.workspace.workspacePath,
        approvalPolicy: this.workspace.defaultApprovalMode,
        sandbox: this.workspace.defaultSandboxMode,
        model: this.workspace.defaultModel,
        persistExtendedHistory: true,
      }
    );
    const thread = isRecord(response.thread) ? response.thread : null;
    const threadId = asString(thread?.id);
    if (!threadId) {
      throw new Error("codex app-server thread/start returned no thread id");
    }
    this.ensureSessionState(threadId, workspacePath);
    this.handshakedThreadIds.add(threadId);
    this.eventRouter.emitRuntimeModel(threadId, response.model);
    this.eventRouter.emitCachedUsageLimits(threadId);
    return threadId;
  }

  async resumeSession(
    threadId: string,
    workspacePath?: string
  ): Promise<string> {
    const response = await this.process.request<Record<string, unknown>>(
      "thread/resume",
      {
        threadId,
        cwd: workspacePath ?? this.workspace.workspacePath,
        approvalPolicy: this.workspace.defaultApprovalMode,
        sandbox: this.workspace.defaultSandboxMode,
        model: this.workspace.defaultModel,
        persistExtendedHistory: true,
      }
    );
    const thread = isRecord(response.thread) ? response.thread : null;
    const resumedThreadId = asString(thread?.id) ?? threadId;
    this.ensureSessionState(resumedThreadId, workspacePath);
    this.handshakedThreadIds.add(resumedThreadId);
    this.eventRouter.emitRuntimeModel(resumedThreadId, response.model);
    this.eventRouter.emitCachedUsageLimits(resumedThreadId);
    return resumedThreadId;
  }

  async closeSession(threadId: string): Promise<void> {
    const state = this.sessions.get(threadId);
    if (state?.activeTurnId) {
      try {
        await this.process.request("turn/interrupt", {
          threadId,
          turnId: state.activeTurnId,
        });
      } catch {
        // Best-effort interrupt only.
      }
    }
    this.sessions.delete(threadId);
    this.handshakedThreadIds.delete(threadId);
    if (this.sessions.size === 0) {
      await this.process.stop();
    }
  }

  async sendMessage(
    threadId: string,
    content: string,
    turnOptions?: CodexTurnOptions
  ): Promise<void> {
    if (!this.handshakedThreadIds.has(threadId)) {
      throw new CodexSessionStaleBindingError(threadId);
    }
    const state = this.ensureSessionState(threadId);
    const appliedConfig = isRecord(turnOptions?.[CODEX_APPLIED_TURN_CONFIG_KEY])
      ? turnOptions[CODEX_APPLIED_TURN_CONFIG_KEY]
      : null;
    const modelId =
      asString(appliedConfig?.modelId) ?? this.workspace.defaultModel;
    const reasoningEffort =
      asString(appliedConfig?.reasoningEffort) ??
      this.workspace.defaultReasoningEffort ??
      null;
    const outputSchema =
      turnOptions && isRecord(turnOptions) && "outputSchema" in turnOptions
        ? turnOptions.outputSchema
        : undefined;
    const response = await this.process.request<Record<string, unknown>>(
      "turn/start",
      {
        threadId,
        input: [
          {
            type: "text",
            text: content,
            text_elements: [],
          },
        ],
        cwd: state.workspacePath,
        model: modelId,
        effort: reasoningEffort,
        summary: resolveTurnReasoningSummaryMode(),
        ...(outputSchema === undefined ? {} : { outputSchema }),
      }
    );
    const turn = isRecord(response.turn) ? response.turn : null;
    const turnId = asString(turn?.id);
    if (turnId) {
      state.activeTurnId = turnId;
    }
  }

  subscribe(
    threadId: string,
    listener: (payload: unknown) => void
  ): () => void {
    const state = this.ensureSessionState(threadId);
    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
    };
  }

  async refreshUsageLimits(): Promise<CodexUsageLimitsStreamPayload | null> {
    const response = await this.process.request<Record<string, unknown>>(
      "account/rateLimits/read"
    );
    return this.eventRouter.registerUsageLimitsSnapshot(response.rateLimits);
  }

  private ensureSessionState(
    threadId: string,
    workspacePath?: string
  ): AppServerSessionState {
    const existing = this.sessions.get(threadId);
    if (existing) {
      if (workspacePath) {
        existing.workspacePath = workspacePath;
      }
      return existing;
    }
    const state: AppServerSessionState = {
      activeTurnId: null,
      assistantTextByItemId: new Map<string, string>(),
      listeners: new Set<(payload: unknown) => void>(),
      reasoningSummariesByItemId: new Map<string, string[]>(),
      workspacePath: workspacePath ?? this.workspace.workspacePath,
    };
    this.sessions.set(threadId, state);
    return state;
  }

  private emit(threadId: string, payload: unknown): void {
    const state = this.sessions.get(threadId);
    if (!state || state.listeners.size === 0) {
      return;
    }
    for (const listener of state.listeners) {
      listener(payload);
    }
  }
}
