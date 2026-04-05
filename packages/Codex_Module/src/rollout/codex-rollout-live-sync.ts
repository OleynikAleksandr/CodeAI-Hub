import crypto from "node:crypto";
import { PROVIDER } from "../messaging/codex-message-processor-shared";
import type { CodexSessionEventEmitter } from "../messaging/codex-session-event-emitter";
import { CodexThoughtTranslationAdapter } from "../messaging/codex-thought-translation-adapter";
import type {
  StructuredOutputResult,
  StructuredOutputStreamController,
} from "../messaging/structured-output-stream-controller";
import type { ActiveSession } from "../session/types";
import type { ModuleReporter } from "../types";
import { CodexRolloutDedupe } from "./codex-rollout-dedupe";
import {
  type CodexRolloutParsedEvent,
  createCodexRolloutSegmentId,
  parseCodexRolloutEvents,
} from "./codex-rollout-event-parser";
import { CodexRolloutReader } from "./codex-rollout-reader";
import { CodexRolloutTailState } from "./codex-rollout-tail-state";

const TERMINAL_DRAIN_ATTEMPTS = 3;
const TERMINAL_DRAIN_DELAY_MS = 75;

const sleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

interface CodexRolloutSyncResult {
  readonly advanced: boolean;
}

export class CodexRolloutLiveSync {
  private readonly dedupeBySession = new WeakMap<
    ActiveSession,
    CodexRolloutDedupe
  >();
  private readonly emittedFinalTurns = new WeakMap<
    ActiveSession,
    Set<string>
  >();
  private readonly emitter: CodexSessionEventEmitter;
  private readonly reader: CodexRolloutReader;
  private readonly structuredOutput: StructuredOutputStreamController;
  private readonly thoughtTranslator: CodexThoughtTranslationAdapter;

  constructor(
    structuredOutput: StructuredOutputStreamController,
    emitter: CodexSessionEventEmitter,
    reporter?: ModuleReporter
  ) {
    this.structuredOutput = structuredOutput;
    this.emitter = emitter;
    this.reader = new CodexRolloutReader();
    this.thoughtTranslator = new CodexThoughtTranslationAdapter(reporter);
  }

  async sync(session: ActiveSession): Promise<CodexRolloutSyncResult> {
    const providerSessionId = session.codexThreadId;
    if (!providerSessionId) {
      return { advanced: false };
    }

    const tailState = this.ensureTailState(session);
    const previousLine = tailState.snapshot()?.nextLine ?? 0;
    const result = await this.reader.readAppendedEntries({
      providerSessionId,
      sinceLine: previousLine,
    });
    if (!result) {
      return { advanced: false };
    }

    const parsedEvents = parseCodexRolloutEvents(result.entries);
    const freshEvents = this.getDedupe(session).filterNew(parsedEvents);
    for (const event of freshEvents) {
      await this.emitParsedEvent(session, event);
    }

    tailState.advance({
      filePath: result.filePath,
      nextLine: result.nextLine,
    });
    return { advanced: result.nextLine > previousLine };
  }

  async drain(session: ActiveSession): Promise<void> {
    let sawAdvance = false;
    for (let attempt = 0; attempt < TERMINAL_DRAIN_ATTEMPTS; attempt++) {
      const result = await this.sync(session);
      if (result.advanced) {
        sawAdvance = true;
      } else if (attempt > 0 || sawAdvance) {
        break;
      }
      if (attempt < TERMINAL_DRAIN_ATTEMPTS - 1) {
        await sleep(TERMINAL_DRAIN_DELAY_MS);
      }
    }
  }

  private async emitParsedEvent(
    session: ActiveSession,
    event: CodexRolloutParsedEvent
  ): Promise<void> {
    if (session.internalTurn) {
      return;
    }

    if (event.kind === "thinking") {
      if (session.runtimeTurnConfig?.thinkingDisplaySyncEnabled === false) {
        return;
      }

      const translated = await this.thoughtTranslator.translateReasoning(
        event.content,
        session.runtimeTurnConfig?.messagesForTheUserLanguage ??
          session.messagesForTheUserLanguage
      );
      this.emitter.emitDialogMessage(
        session,
        "thinking",
        translated ?? event.content,
        this.buildSegmentId(event)
      );
      return;
    }

    if (event.kind === "commentary") {
      if (this.structuredOutput.shouldSuppressCommentary(session.sessionId)) {
        return;
      }
      this.emitter.emitDialogMessage(
        session,
        "assistant",
        event.content,
        this.buildSegmentId(event)
      );
      return;
    }

    if (event.kind === "final_answer") {
      this.emitFinalAssistant(session, event);
      return;
    }

    if (
      event.kind === "task_complete" &&
      !(event.turnId && this.hasFinalTurn(session, event.turnId))
    ) {
      this.emitFinalAssistant(session, event);
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

  private emitFinalAssistant(
    session: ActiveSession,
    event: CodexRolloutParsedEvent
  ): void {
    const itemId = this.buildSegmentId(event);
    const result = this.structuredOutput.complete(
      session.sessionId,
      itemId,
      event.content
    );
    if (result.streamDelta) {
      this.emitAssistantChunk(session, itemId, result.streamDelta);
    }
    this.emitStructuredOutput(session, itemId, result);
    if (!result.assistantText) {
      return;
    }

    if (event.turnId) {
      this.getFinalTurns(session).add(event.turnId);
    }
    this.emitter.emitMessage(session, {
      type: "assistant",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      content: result.assistantText,
      uuid: itemId,
      timestamp: event.timestamp ?? new Date().toISOString(),
    });
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

  private ensureTailState(session: ActiveSession): CodexRolloutTailState {
    session.rolloutTailState ??= new CodexRolloutTailState();
    return session.rolloutTailState;
  }

  private getDedupe(session: ActiveSession): CodexRolloutDedupe {
    const existing = this.dedupeBySession.get(session);
    if (existing) {
      return existing;
    }
    const next = new CodexRolloutDedupe();
    this.dedupeBySession.set(session, next);
    return next;
  }

  private getFinalTurns(session: ActiveSession): Set<string> {
    const existing = this.emittedFinalTurns.get(session);
    if (existing) {
      return existing;
    }
    const next = new Set<string>();
    this.emittedFinalTurns.set(session, next);
    return next;
  }

  private hasFinalTurn(session: ActiveSession, turnId: string): boolean {
    return this.getFinalTurns(session).has(turnId);
  }

  private shouldEmitStructuredOutput(
    session: ActiveSession,
    dedupeId: string
  ): boolean {
    session.structuredOutputUuids ??= new Set<string>();
    if (session.structuredOutputUuids.has(dedupeId)) {
      return false;
    }
    session.structuredOutputUuids.add(dedupeId);
    return true;
  }

  private buildSegmentId(event: CodexRolloutParsedEvent): string {
    return `${PROVIDER}:rollout:${createCodexRolloutSegmentId(event)}`;
  }
}
