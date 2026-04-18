import crypto from "node:crypto";
import type { TurnCompletedEvent } from "@openai/codex-sdk";
import type { ActiveSession } from "../session/types";
import type { CodexUsageLimits } from "../types";
import {
  PROVIDER,
  type TurnLifecycleState,
} from "./codex-message-processor-shared";
import type { CodexReasoningStreams } from "./codex-reasoning-streams";
import type { CodexSessionEventEmitter } from "./codex-session-event-emitter";
import type { CodexTokenUsageSync } from "./codex-token-usage-sync";
import type { CodexUsageSync } from "./codex-usage-sync";
import type { StructuredOutputStreamController } from "./structured-output-stream-controller";

interface CodexTerminalTokenUsage {
  readonly limit: number;
  readonly used: number;
}

interface CodexTokenUsageReaderBridge {
  getCachedSnapshot(providerSessionId: string): CodexTerminalTokenUsage | null;
  read(payload: {
    readonly providerSessionId: string;
  }): Promise<CodexTerminalTokenUsage | null>;
}

interface CodexTokenUsageSyncBridge {
  readonly tokenUsageCache: Map<string, CodexTerminalTokenUsage>;
  readonly tokenUsageReader: CodexTokenUsageReaderBridge;
}

export class CodexMessageFinishHandler {
  private readonly emitter: CodexSessionEventEmitter;
  private readonly reasoningStreams: CodexReasoningStreams;
  private readonly structuredOutput: StructuredOutputStreamController;
  private readonly tokenUsageSync: CodexTokenUsageSync;
  private readonly userTurnLifecycle = new WeakMap<
    ActiveSession,
    TurnLifecycleState
  >();
  private readonly usageSync: CodexUsageSync;

  constructor(
    structuredOutput: StructuredOutputStreamController,
    reasoningStreams: CodexReasoningStreams,
    emitter: CodexSessionEventEmitter,
    tokenUsageSync: CodexTokenUsageSync,
    usageSync: CodexUsageSync
  ) {
    this.structuredOutput = structuredOutput;
    this.reasoningStreams = reasoningStreams;
    this.emitter = emitter;
    this.tokenUsageSync = tokenUsageSync;
    this.usageSync = usageSync;
  }

  beginUserTurn(session: ActiveSession): void {
    this.userTurnLifecycle.set(session, { started: false, ended: false });
  }

  handleTurnStarted(session: ActiveSession): void {
    const state = this.userTurnLifecycle.get(session);
    if (state && !state.started && !state.ended) {
      state.started = true;
      this.emitter.emitMessage(session, {
        type: "turn_started",
        provider: PROVIDER,
        sessionId: session.sessionId,
        threadId: session.codexThreadId ?? undefined,
        uuid: `${crypto.randomUUID()}::turn_started`,
        timestamp: new Date().toISOString(),
      });
    }

    if (session.internalTurn) {
      return;
    }
    session.structuredOutputUuids = new Set();
    this.structuredOutput.startTurn(session.sessionId);
  }

  async handleTurnCompleted(
    session: ActiveSession,
    event: TurnCompletedEvent
  ): Promise<void> {
    const startedAt = Date.now();
    session.logger?.logSDKEvent("processor.turn.completed.begin", {
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      internal: session.internalTurn ?? false,
      timestampIso: new Date().toISOString(),
    });

    const [usageLimits, terminalTokenUsage] = await Promise.all([
      this.usageSync.safeRefresh(session),
      this.readTerminalTokenUsage(session),
    ]);
    this.maybeEmitTurnCompleted(
      session,
      event.usage,
      usageLimits,
      terminalTokenUsage.snapshot
    );
    if (terminalTokenUsage.shouldEmitStreamEvent) {
      this.emitTerminalTokenUsage(session, terminalTokenUsage.snapshot);
    }
    this.clearSessionState(session);

    session.logger?.logSDKEvent("processor.turn.completed.done", {
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      internal: session.internalTurn ?? false,
      elapsedMs: Date.now() - startedAt,
      hasTokenUsage: Boolean(terminalTokenUsage.snapshot),
      hasUsageLimits: Boolean(usageLimits),
      timestampIso: new Date().toISOString(),
    });
  }

  handleTurnFailed(session: ActiveSession, error: unknown): void {
    this.maybeEmitTurnFailed(session, error);
    this.clearSessionState(session);
  }

  handleExecutionError(session: ActiveSession, error: unknown): void {
    this.maybeEmitTurnFailed(session, error);
  }

  async handleRuntimeUsageEvent(
    session: ActiveSession,
    event: unknown
  ): Promise<boolean> {
    return await this.usageSync.handleRuntimeEvent(session, event);
  }

  clearSessionState(session: ActiveSession): void {
    this.structuredOutput.clear(session.sessionId);
    this.reasoningStreams.clear(session.sessionId);
  }

  private maybeEmitTurnCompleted(
    session: ActiveSession,
    usage: unknown,
    usageLimits: CodexUsageLimits,
    tokenUsage: CodexTerminalTokenUsage | null
  ): void {
    const state = this.userTurnLifecycle.get(session);
    if (!state || state.ended) {
      return;
    }
    if (!state.started) {
      this.handleTurnStarted(session);
    }

    state.ended = true;
    this.emitter.emitMessage(session, {
      type: "turn_completed",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId ?? undefined,
      uuid: `${crypto.randomUUID()}::turn_completed`,
      timestamp: new Date().toISOString(),
      tokenUsage: tokenUsage ?? undefined,
      usage: usage ?? undefined,
      usageLimits: usageLimits ?? undefined,
    });
  }

  private maybeEmitTurnFailed(session: ActiveSession, error: unknown): void {
    const state = this.userTurnLifecycle.get(session);
    if (!state || state.ended) {
      return;
    }
    if (!state.started) {
      this.handleTurnStarted(session);
    }

    state.ended = true;
    this.emitter.emitMessage(session, {
      type: "turn_failed",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId ?? undefined,
      message: error instanceof Error ? error.message : String(error),
      error,
      uuid: `${crypto.randomUUID()}::turn_failed`,
      timestamp: new Date().toISOString(),
    });
  }

  private async readTerminalTokenUsage(session: ActiveSession): Promise<{
    readonly shouldEmitStreamEvent: boolean;
    readonly snapshot: CodexTerminalTokenUsage | null;
  }> {
    const providerSessionId = session.codexThreadId;
    if (!providerSessionId) {
      return { shouldEmitStreamEvent: false, snapshot: null };
    }

    const bridge = this.tokenUsageSync as unknown as CodexTokenUsageSyncBridge;
    const previous = bridge.tokenUsageCache.get(session.sessionId) ?? null;
    const next =
      (await bridge.tokenUsageReader
        .read({ providerSessionId })
        .catch(() => null)) ??
      bridge.tokenUsageReader.getCachedSnapshot(providerSessionId) ??
      previous;
    if (!next) {
      return { shouldEmitStreamEvent: false, snapshot: null };
    }

    bridge.tokenUsageCache.set(session.sessionId, next);
    return {
      shouldEmitStreamEvent:
        !previous ||
        previous.used !== next.used ||
        previous.limit !== next.limit,
      snapshot: next,
    };
  }

  private emitTerminalTokenUsage(
    session: ActiveSession,
    tokenUsage: CodexTerminalTokenUsage | null
  ): void {
    if (!tokenUsage) {
      return;
    }

    this.emitter.emitMessage(session, {
      type: "stream_event",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId ?? undefined,
      tokenUsage,
      data: {
        kind: "token_usage",
        limit: tokenUsage.limit,
        used: tokenUsage.used,
      },
      uuid: `${crypto.randomUUID()}::token_usage`,
      timestamp: new Date().toISOString(),
    });
  }
}
