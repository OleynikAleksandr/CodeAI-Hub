import { randomUUID } from "node:crypto";
import type { UsageMetadata } from "@google/genai";
import { ThoughtTranslatorService } from "../messaging/thought-translator-service";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { ModuleReporter } from "../types";
import { GeminiSessionBootstrapper } from "./gemini-session-bootstrapper";
import { GeminiSessionLifecycle } from "./gemini-session-lifecycle";
import { GeminiSessionStore } from "./gemini-session-store";
import { GeminiToolCallOrchestrator } from "./gemini-tool-call-orchestrator";
import { GeminiToolExecutorFacade } from "./gemini-tool-executor-facade";
import { GeminiTurnRunner } from "./gemini-turn-runner";
import type {
  ActiveSession,
  SessionCreationOptions,
  SessionCreationResult,
} from "./types";

export class GeminiSessionManager {
  private readonly sessionLifecycle: GeminiSessionLifecycle;
  private readonly sessionBootstrapper: GeminiSessionBootstrapper;
  private readonly sessionStore = new GeminiSessionStore();
  private readonly turnRunner: GeminiTurnRunner;
  private readonly modules: GeminiCliModules;
  private readonly toolExecutorFacade: GeminiToolExecutorFacade;
  private readonly thoughtTranslator: ThoughtTranslatorService;
  private readonly reporter?: ModuleReporter;

  constructor(modules: GeminiCliModules, reporter?: ModuleReporter) {
    this.modules = modules;
    this.reporter = reporter;
    this.sessionBootstrapper = new GeminiSessionBootstrapper(modules);
    this.sessionLifecycle = new GeminiSessionLifecycle();
    this.toolExecutorFacade = new GeminiToolExecutorFacade(
      this.modules,
      reporter
    );
    this.thoughtTranslator = new ThoughtTranslatorService(reporter);
    this.turnRunner = new GeminiTurnRunner({
      emitEvents: (session, events) =>
        this.sessionLifecycle.emitEvents(session, events),
      modules: this.modules,
      reporter,
      thoughtTranslator: this.thoughtTranslator,
      toolCallOrchestrator: new GeminiToolCallOrchestrator(
        this.toolExecutorFacade
      ),
    });
  }

  listSessions(): readonly ActiveSession[] {
    return this.sessionStore.listSessions();
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessionStore.getSession(sessionId);
  }

  createSession(
    options: SessionCreationOptions
  ): Promise<SessionCreationResult> {
    return this.startSession(options);
  }

  resumeSession(
    sessionId: string,
    options: Omit<SessionCreationOptions, "resumeSessionId">
  ): Promise<SessionCreationResult> {
    const normalizedSessionId = sessionId.trim();
    if (normalizedSessionId.length === 0) {
      throw new Error("Cannot resume Gemini session with an empty session id.");
    }
    return this.startSession({
      ...options,
      resumeSessionId: normalizedSessionId,
    });
  }

  private async startSession(
    options: SessionCreationOptions
  ): Promise<SessionCreationResult> {
    const { providerSessionId, requestedSessionId, session } =
      await this.sessionBootstrapper.bootstrap(options);

    session.logger?.start(requestedSessionId);
    this.sessionStore.registerSession(requestedSessionId, session);

    this.sessionLifecycle.emitEvents(session, [
      {
        type: "system",
        provider: "gemini",
        content: `Gemini session initialized (model: ${session.config.getModel()}).`,
      },
    ]);
    let resolvedSessionId: string = requestedSessionId;
    if (providerSessionId && providerSessionId.length > 0) {
      resolvedSessionId = this.sessionStore.promoteSessionId(
        requestedSessionId,
        providerSessionId,
        session
      );
    } else {
      session.logger?.renameSession?.(requestedSessionId, requestedSessionId);
    }
    queueMicrotask(() => {
      session.eventEmitter.emit("realSessionId", resolvedSessionId);
      if (
        providerSessionId &&
        providerSessionId.length > 0 &&
        providerSessionId !== requestedSessionId
      ) {
        session.eventEmitter.emit("sessionIdChanged", {
          oldId: requestedSessionId,
          newId: resolvedSessionId,
          provider: "gemini",
        });
      }
    });

    return { sessionId: resolvedSessionId, session };
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.sessionStore.requireSession(sessionId);
    session.reporter?.info?.("Gemini sendMessage called", {
      sessionId,
      actualSessionId: session.sessionId,
      contentLength: content.length,
      status: session.status,
    });
    if (session.status === "streaming") {
      throw new Error("Gemini session already has an in-flight request.");
    }
    if (session.status === "closed") {
      throw new Error("Gemini session is closed.");
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      throw new Error("Cannot send empty Gemini prompt.");
    }

    this.sessionLifecycle.applyPendingModelOverride(
      this as unknown as Record<string, unknown>,
      session
    );

    const promptId = randomUUID();
    const abortController = new AbortController();
    session.abortController = abortController;
    session.status = "streaming";

    const { reset: resetWatchdog, clear: clearWatchdog } =
      this.sessionLifecycle.createIdleWatchdog(abortController);
    resetWatchdog();
    (session as unknown as Record<string, unknown>).resetWatchdog =
      resetWatchdog;

    const timestamp = new Date().toISOString();
    session.eventEmitter.emit("message", {
      type: "turn_started",
      provider: "gemini",
      sessionId: session.sessionId,
      uuid: `${randomUUID()}::turn_started`,
      timestamp,
      data: {
        promptId,
      },
    });
    session.logger?.logUserInput({
      promptId,
      content: trimmed,
      timestamp,
    });

    this.sessionLifecycle.emitEvents(session, [
      {
        type: "user_input",
        provider: "gemini",
        content: trimmed,
        data: {
          promptId,
          timestamp,
        },
      },
    ]);

    let didComplete = false;
    let lastUsage: UsageMetadata | undefined;
    try {
      const result = await this.turnRunner.processTurns({
        session,
        parts: [{ text: trimmed }],
        promptId,
        signal: abortController.signal,
        depth: 0,
      });
      lastUsage = result.usage;

      if (result.depthExceeded) {
        this.sessionLifecycle.emitEvents(session, [
          {
            type: "system",
            provider: "gemini",
            content:
              "Exceeded maximum tool execution chain depth. Stopping conversation.",
          },
        ]);
      }

      const finalText = result.text.trim();
      const finalCitations = [...result.citations];

      if (result.assistantSegmentsEmitted === 0 && finalText.length > 0) {
        session.logger?.logEvent({
          type: "assistant_response",
          promptId,
          content: finalText,
          citations: finalCitations,
        });

        this.sessionLifecycle.emitEvents(session, [
          {
            type: "assistant",
            provider: "gemini",
            content: finalText,
            data: {
              promptId,
              usage: result.usage,
              citations: finalCitations,
            },
          },
        ]);
      }
      didComplete = true;
    } catch (error) {
      session.logger?.logError({
        error,
        promptId,
        stage: "send",
      });
      this.sessionLifecycle.emitEvents(session, [
        {
          type: "error",
          provider: "gemini",
          content: error instanceof Error ? error.message : String(error),
        },
      ]);
      throw error;
    } finally {
      clearWatchdog();
      (session as unknown as Record<string, unknown>).resetWatchdog = undefined;
      if (session.abortController && !session.abortController.signal.aborted) {
        session.abortController.abort();
      }
      session.abortController = null;
      session.status = "idle";
      if (didComplete) {
        const completedTimestamp = new Date().toISOString();
        const used = this.sessionLifecycle.extractTokenUsageUsed(lastUsage);
        if (used !== null) {
          session.eventEmitter.emit("message", {
            type: "stream_event",
            provider: "gemini",
            sessionId: session.sessionId,
            uuid: `${randomUUID()}::token_usage`,
            timestamp: completedTimestamp,
            tokenUsage: {
              used,
              limit: session.contextWindowTokenLimit,
            },
            data: {
              kind: "token_usage",
              used,
              limit: session.contextWindowTokenLimit,
            },
          });
        }
        session.eventEmitter.emit("message", {
          type: "turn_completed",
          provider: "gemini",
          sessionId: session.sessionId,
          uuid: `${randomUUID()}::turn_completed`,
          timestamp: completedTimestamp,
          data: {
            promptId,
          },
        });
      }
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.sessionLifecycle.closeSession(this.sessionStore, sessionId);
  }
}
