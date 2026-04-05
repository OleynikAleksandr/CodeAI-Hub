import crypto from "node:crypto";
import type {
  ThreadErrorEvent,
  ThreadEvent,
  ThreadItem,
} from "@openai/codex-sdk";
import type { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { ModuleReporter } from "../types";
import type { CodexMessageFinishHandler } from "./codex-message-finish-handler";
import {
  isAgentMessageItem,
  PROVIDER,
  shouldSuppressAgentMessageItem,
  type ThreadItemEvent,
} from "./codex-message-processor-shared";
import type { CodexReasoningStreams } from "./codex-reasoning-streams";
import type { CodexSessionEventEmitter } from "./codex-session-event-emitter";
import { CodexThoughtTranslationAdapter } from "./codex-thought-translation-adapter";
import { handleCodexThreadStarted } from "./codex-thread-start-handler";
import type {
  StructuredOutputResult,
  StructuredOutputStreamController,
} from "./structured-output-stream-controller";

const SUBSTANTIVE_FALLBACK_MIN_LENGTH = 160,
  SUBSTANTIVE_FALLBACK_MULTILINE_RE = /\n(?:\d+\.\s+|- |\* )/;
const isSubstantiveFallbackCandidate = (content: string): boolean => {
  const trimmed = content.trim();
  return (
    trimmed.length >= SUBSTANTIVE_FALLBACK_MIN_LENGTH ||
    SUBSTANTIVE_FALLBACK_MULTILINE_RE.test(trimmed)
  );
};

export class CodexStreamEventRouter {
  private readonly emitter: CodexSessionEventEmitter;
  private readonly fallbackAssistantCandidates = new Map<
    string,
    { readonly content: string; readonly itemId: string }
  >();
  private readonly finishHandler: CodexMessageFinishHandler;
  private readonly pendingAgentMessages = new Map<
    string,
    { readonly itemId: string; readonly result: StructuredOutputResult }
  >();
  readonly reasoningStreams: CodexReasoningStreams;
  private readonly reporter?: ModuleReporter;
  private readonly sessionManager: CodexSessionManager;
  readonly structuredOutput: StructuredOutputStreamController;
  private readonly thoughtTranslator: CodexThoughtTranslationAdapter;

  constructor(
    sessionManager: CodexSessionManager,
    structuredOutput: StructuredOutputStreamController,
    reasoningStreams: CodexReasoningStreams,
    emitter: CodexSessionEventEmitter,
    finishHandler: CodexMessageFinishHandler,
    reporter?: ModuleReporter
  ) {
    this.sessionManager = sessionManager;
    this.structuredOutput = structuredOutput;
    this.reasoningStreams = reasoningStreams;
    this.emitter = emitter;
    this.finishHandler = finishHandler;
    this.reporter = reporter;
    this.thoughtTranslator = new CodexThoughtTranslationAdapter(reporter);
  }

  async dispatchEvent(
    session: ActiveSession,
    event: ThreadEvent
  ): Promise<void> {
    session.logger?.logSDKEvent(event.type, event);
    switch (event.type) {
      case "thread.started":
        this.handleThreadStarted(session, event.thread_id);
        return;
      case "turn.started":
        this.clearFallbackAssistantCandidate(session.sessionId);
        this.finishHandler.handleTurnStarted(session);
        return;
      case "turn.completed":
        if (!this.flushPendingAgentMessageAsAssistant(session)) {
          this.emitFallbackAssistantCandidate(session);
        }
        await this.finishHandler.handleTurnCompleted(session, event);
        return;
      case "turn.failed":
        await this.flushPendingAgentMessageAsThinking(session);
        this.clearFallbackAssistantCandidate(session.sessionId);
        this.finishHandler.handleTurnFailed(session, event.error);
        return;
      case "item.started":
      case "item.updated":
      case "item.completed":
        await this.flushPendingAgentMessageBeforeItemEvent(session, event);
        await this.handleThreadItem(session, event);
        return;
      case "error":
        await this.flushPendingAgentMessageAsThinking(session);
        this.handleStreamError(session, event);
        return;
      default:
        if (await this.finishHandler.handleRuntimeUsageEvent(session, event)) {
          return;
        }
        this.reporter?.warn?.(
          `Unhandled Codex event ${(event as { type: string }).type}`
        );
    }
  }

  private handleThreadStarted(session: ActiveSession, threadId: string): void {
    handleCodexThreadStarted({
      session,
      threadId,
      sessionManager: this.sessionManager,
      structuredOutput: this.structuredOutput,
      reasoningStreams: this.reasoningStreams,
      emitter: this.emitter,
      reporter: this.reporter,
    });
  }

  private handleStreamError(
    session: ActiveSession,
    event: ThreadErrorEvent
  ): void {
    this.clearFallbackAssistantCandidate(session.sessionId);
    this.emitter.emitMessage(session, {
      type: "stream_error",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      message: event.message,
      timestamp: new Date().toISOString(),
    });
    this.finishHandler.clearSessionState(session);
  }

  private async handleThreadItem(
    session: ActiveSession,
    event: ThreadItemEvent
  ): Promise<void> {
    const item = event.item as ThreadItem;
    if (
      Boolean(session.rolloutTailState?.snapshot()) &&
      (item.type === "reasoning" || isAgentMessageItem(item))
    ) {
      return;
    }
    if (item.type === "reasoning") {
      await this.handleReasoningItem(session, event, item);
      return;
    }
    if (isAgentMessageItem(item)) {
      this.handleAgentMessageItem(session, event, item);
    }
  }

  private handleReasoningItem(
    session: ActiveSession,
    event: ThreadItemEvent,
    item: ThreadItem & { readonly type: "reasoning"; readonly text?: unknown }
  ): Promise<void> | void {
    if (session.internalTurn || typeof item.text !== "string") {
      return;
    }
    if (event.type === "item.updated") {
      const delta = this.reasoningStreams.append(
        session.sessionId,
        item.id,
        item.text
      );
      if (delta) {
        return this.emitTranslatedReasoning(session, item.id, delta);
      }
      return;
    }
    if (event.type === "item.completed") {
      const delta = this.reasoningStreams.complete(
        session.sessionId,
        item.id,
        item.text
      );
      if (delta) {
        return this.emitTranslatedReasoning(session, item.id, delta);
      }
    }
  }

  private async emitTranslatedReasoning(
    session: ActiveSession,
    itemId: string,
    delta: string
  ): Promise<void> {
    const translated = await this.thoughtTranslator.translateReasoning(
      delta,
      session.messagesForTheUserLanguage
    );
    this.emitter.emitDialogMessage(
      session,
      "thinking",
      translated ?? delta,
      itemId
    );
  }

  private handleAgentMessageItem(
    session: ActiveSession,
    event: ThreadItemEvent,
    item: ThreadItem & {
      readonly type: "agent_message";
      readonly text?: unknown;
    }
  ): void {
    if (
      shouldSuppressAgentMessageItem(
        this.structuredOutput,
        session.sessionId,
        item
      )
    ) {
      return;
    }
    if (session.runtimeTurnConfig?.thinkingDisplaySyncEnabled === false) {
      if (event.type === "item.updated") {
        this.handleAgentMessageUpdate(session, item.id, item.text);
        return;
      }
      if (event.type === "item.completed") {
        this.handleAgentMessageComplete(session, item.id, item.text);
      }
      return;
    }
    if (event.type === "item.updated") {
      this.bufferAgentMessageUpdate(session, item.id, item.text);
      return;
    }
    if (event.type === "item.completed") {
      this.bufferAgentMessageComplete(session, item.id, item.text);
    }
  }

  private bufferAgentMessageUpdate(
    session: ActiveSession,
    itemId: string,
    text: unknown
  ): void {
    if (session.internalTurn || typeof text !== "string") {
      return;
    }
    this.structuredOutput.appendChunk(session.sessionId, itemId, text);
  }

  private bufferAgentMessageComplete(
    session: ActiveSession,
    itemId: string,
    text: unknown
  ): void {
    if (session.internalTurn) {
      return;
    }

    const result = this.structuredOutput.complete(
      session.sessionId,
      itemId,
      typeof text === "string" ? text : ""
    );
    this.pendingAgentMessages.set(session.sessionId, { itemId, result });
  }

  private handleAgentMessageUpdate(
    session: ActiveSession,
    itemId: string,
    text: unknown
  ): void {
    if (session.internalTurn || typeof text !== "string") {
      return;
    }
    const delta = this.structuredOutput.appendChunk(
      session.sessionId,
      itemId,
      text
    );
    if (delta) {
      this.emitAssistantChunk(session, itemId, delta);
    }
  }

  private handleAgentMessageComplete(
    session: ActiveSession,
    itemId: string,
    text: unknown
  ): void {
    if (session.internalTurn) {
      return;
    }

    const result = this.structuredOutput.complete(
      session.sessionId,
      itemId,
      typeof text === "string" ? text : ""
    );
    if (result.streamDelta) {
      this.emitAssistantChunk(session, itemId, result.streamDelta);
    }
    this.emitStructuredOutput(session, itemId, result);
    if (result.assistantText) {
      this.emitter.emitMessage(session, {
        type: "assistant",
        provider: PROVIDER,
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        content: result.assistantText,
        uuid: itemId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private emitAssistantChunk(
    session: ActiveSession,
    itemId: string,
    text: string
  ): void {
    this.emitter.emitMessage(session, {
      type: "stream_event",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      data: { kind: "assistant_chunk", itemId, text },
      timestamp: new Date().toISOString(),
    });
  }

  private async flushPendingAgentMessageBeforeItemEvent(
    session: ActiveSession,
    event: ThreadItemEvent
  ): Promise<void> {
    const pending = this.pendingAgentMessages.get(session.sessionId);
    if (!pending) {
      return;
    }

    const item = event.item as ThreadItem;
    if (item.type === "agent_message" && item.id === pending.itemId) {
      return;
    }

    this.rememberFallbackAssistantCandidate(session.sessionId, pending, item);
    await this.flushPendingAgentMessageAsThinking(session);
  }

  private flushPendingAgentMessageAsAssistant(session: ActiveSession): boolean {
    const pending = this.pendingAgentMessages.get(session.sessionId);
    if (!pending) {
      return false;
    }

    this.pendingAgentMessages.delete(session.sessionId);
    this.emitStructuredOutput(session, pending.itemId, pending.result);
    if (!pending.result.assistantText) {
      return false;
    }

    this.clearFallbackAssistantCandidate(session.sessionId);
    this.emitter.emitMessage(session, {
      type: "assistant",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      content: pending.result.assistantText,
      uuid: pending.itemId,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  private async flushPendingAgentMessageAsThinking(
    session: ActiveSession
  ): Promise<void> {
    const pending = this.pendingAgentMessages.get(session.sessionId);
    if (!pending) {
      return;
    }

    this.pendingAgentMessages.delete(session.sessionId);
    const content = pending.result.assistantText?.trim();
    if (!content) {
      return;
    }

    const translated = await this.thoughtTranslator.translateReasoning(
      content,
      session.runtimeTurnConfig?.messagesForTheUserLanguage ??
        session.messagesForTheUserLanguage
    );
    this.emitter.emitDialogMessage(
      session,
      "thinking",
      translated ?? content,
      pending.itemId
    );
  }

  private rememberFallbackAssistantCandidate(
    sessionId: string,
    pending: PendingAgentMessage,
    triggerItem: ThreadItem
  ): void {
    if (triggerItem.type !== "reasoning") {
      return;
    }
    const content = pending.result.assistantText?.trim();
    if (!(content && isSubstantiveFallbackCandidate(content))) {
      return;
    }
    this.fallbackAssistantCandidates.set(sessionId, {
      itemId: pending.itemId,
      content,
    });
  }

  private emitFallbackAssistantCandidate(session: ActiveSession): void {
    const candidate = this.fallbackAssistantCandidates.get(session.sessionId);
    if (!candidate) {
      return;
    }
    this.clearFallbackAssistantCandidate(session.sessionId);
    this.emitter.emitMessage(session, {
      type: "assistant",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      content: candidate.content,
      uuid: candidate.itemId,
      timestamp: new Date().toISOString(),
    });
  }

  private clearFallbackAssistantCandidate(sessionId: string): void {
    this.fallbackAssistantCandidates.delete(sessionId);
  }

  private emitStructuredOutput(
    session: ActiveSession,
    itemId: string,
    result: StructuredOutputResult
  ): void {
    const hasArtifacts =
      Array.isArray(result.artifacts) && result.artifacts.length > 0;
    if (!(result.artifact || hasArtifacts)) {
      return;
    }

    const dedupeId = result.outputHash ?? itemId;
    if (!this.shouldEmitStructuredOutput(session, dedupeId)) {
      return;
    }
    this.emitter.emitMessage(session, {
      type: "stream_event",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      data: {
        kind: "structured_output",
        artifact: result.artifact,
        artifacts: hasArtifacts ? result.artifacts : undefined,
        nextAction: result.nextAction,
        suggested_response: result.assistantText,
      },
      uuid: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
  }

  private shouldEmitStructuredOutput(
    session: ActiveSession,
    dedupeId: string
  ): boolean {
    if (!session.structuredOutputUuids) {
      session.structuredOutputUuids = new Set();
    }
    if (session.structuredOutputUuids.has(dedupeId)) {
      return false;
    }
    session.structuredOutputUuids.add(dedupeId);
    return true;
  }
}
