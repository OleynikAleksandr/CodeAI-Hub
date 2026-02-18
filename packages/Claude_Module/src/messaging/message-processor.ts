import crypto from "node:crypto";
import { ClaudeContextUsageReader } from "../sdk/claude-context-usage-reader";
import { ClaudeUsageLimitsReader } from "../sdk/claude-usage-limits-reader";
import type { UsageLimitsSnapshot } from "../sdk/claude-usage-limits-snapshot";
import type { SDKSessionManager } from "../session/session-manager";
import type {
  ActiveSession,
  ClaudeQueuedTurn,
  ClaudeTurnProcessorHooks,
} from "../session/types";
import type { ClaudeStreamMessage, ModuleReporter } from "../types";
import type { IdeaCollectorStructuredOutput } from "./idea-collector-structured-output";
import {
  parseIdeaCollectorOutputFromResultMessage,
  parseIdeaCollectorOutputFromText,
} from "./idea-collector-structured-output";
import { extractVariantBArtifacts } from "./structured-output-utils";

const QUESTION_SLOT_PATTERN = /^question\d*$/i;

type VariantBArtifact = ReturnType<typeof extractVariantBArtifacts> extends
  | (infer Item)[]
  | null
  ? Item
  : never;

type VariantBPartition = {
  readonly artifacts?: VariantBArtifact[];
  readonly questions: string[];
};

const partitionVariantBArtifacts = (
  artifacts: VariantBArtifact[] | null
): VariantBPartition => {
  if (!Array.isArray(artifacts)) {
    return { questions: [] };
  }

  const keep: VariantBArtifact[] = [];
  const questions: string[] = [];
  for (const artifact of artifacts) {
    const slot = artifact.slot.trim();
    const markdown = artifact.markdown.trim();
    if (!(slot && markdown)) {
      continue;
    }
    if (QUESTION_SLOT_PATTERN.test(slot)) {
      questions.push(markdown);
      continue;
    }
    keep.push({ slot, markdown });
  }

  return {
    artifacts: keep.length > 0 ? keep : undefined,
    questions,
  };
};

const appendQuestionsToSuggestedResponse = (
  suggestedResponse: string | null | undefined,
  questions: string[]
): string | null => {
  if (questions.length === 0) {
    return suggestedResponse ?? null;
  }
  const questionsBlock = `Вопросы:\n${questions
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n")}`;
  if (suggestedResponse && suggestedResponse.trim().length > 0) {
    return `${suggestedResponse}\n\n${questionsBlock}`;
  }
  return questionsBlock;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;

// Fallback: extract token usage directly from the SDK result message when the
// /context probe is unavailable (e.g. five-hour rate limit). modelUsage contains
// contextWindow (limit) and cumulative token counts for the session.
const extractTokenUsageFromResultMessage = (
  message: ClaudeStreamMessage
): TokenUsageSnapshot | null => {
  const modelUsage = message.modelUsage;
  if (!isRecord(modelUsage)) {
    return null;
  }
  for (const model of Object.values(modelUsage)) {
    if (!isRecord(model)) {
      continue;
    }
    const contextWindow = readFiniteNumber(model.contextWindow);
    if (!contextWindow || contextWindow <= 0) {
      continue;
    }
    const tokens = [
      readFiniteNumber(model.inputTokens),
      readFiniteNumber(model.outputTokens),
      readFiniteNumber(model.cacheCreationInputTokens),
      readFiniteNumber(model.cacheReadInputTokens),
    ].filter((n): n is number => n !== null);
    if (tokens.length > 0) {
      const used = tokens.reduce((sum, n) => sum + n, 0);
      return { used, limit: contextWindow };
    }
  }
  return null;
};

type ContextUsageReaderConfig = {
  readonly executablePath: string;
  readonly env: NodeJS.ProcessEnv;
};

type TokenUsageSnapshot = {
  readonly used: number;
  readonly limit: number;
};

const areUsageLimitsEqual = (
  left: UsageLimitsSnapshot,
  right: UsageLimitsSnapshot
): boolean => {
  const eqBucket = (
    a: UsageLimitsSnapshot[keyof UsageLimitsSnapshot],
    b: UsageLimitsSnapshot[keyof UsageLimitsSnapshot]
  ): boolean => {
    if (a === null || b === null) {
      return a === b;
    }
    return a.percentUsed === b.percentUsed && a.resetsAt === b.resetsAt;
  };

  return (
    eqBucket(left.currentSession, right.currentSession) &&
    eqBucket(left.currentWeekAllModels, right.currentWeekAllModels) &&
    eqBucket(left.currentWeekSonnetOnly, right.currentWeekSonnetOnly)
  );
};

const normalizeUsageLimitsSnapshot = (
  snapshot: UsageLimitsSnapshot
): UsageLimitsSnapshot => {
  return {
    currentSession: snapshot.currentSession ?? null,
    currentWeekAllModels: snapshot.currentWeekAllModels ?? null,
    // Keep sonnet bucket disabled to preserve current UI contract.
    currentWeekSonnetOnly: null,
  };
};

const MIN_REFRESH_INTERVAL_MS = 1500;
const TEMP_SESSION_PREFIX = "temp_";

const readStructuredOutput = (
  source: Record<string, unknown>
): Record<string, unknown> | null => {
  const candidate = source.structured_output ?? source.structuredOutput;
  return isRecord(candidate) ? candidate : null;
};

const shouldSkipSDKMessageLog = (message: ClaudeStreamMessage): boolean => {
  if (message.type !== "stream_event") {
    return false;
  }
  const event = message.event;
  return isRecord(event) && event.type === "content_block_delta";
};

type ProcessResponseOptions = {
  readonly sessionId: string;
  readonly iterator: AsyncIterable<ClaudeStreamMessage>;
  readonly onRealSessionId: (sessionId: string) => void;
};

type MessageProcessorOptions = {
  readonly projectPath: string;
  readonly reporter?: ModuleReporter;
};

export class SDKMessageProcessor {
  private readonly sessionManager: SDKSessionManager;
  private readonly options: MessageProcessorOptions;
  private readonly tokenUsageCache = new Map<
    string,
    { used: number; limit: number }
  >();
  private contextUsageReader: ClaudeContextUsageReader | null = null;
  private usageLimitsReader: ClaudeUsageLimitsReader | null = null;
  private readonly contextUsageInFlight = new Map<
    string,
    Promise<TokenUsageSnapshot | null>
  >();
  private readonly contextUsageLastAttemptAt = new Map<string, number>();
  private readonly usageLimitsCache = new Map<string, UsageLimitsSnapshot>();
  private readonly usageLimitsInFlight = new Map<
    string,
    Promise<UsageLimitsSnapshot | null>
  >();
  private readonly usageLimitsLastAttemptAt = new Map<string, number>();

  constructor(
    sessionManager: SDKSessionManager,
    options: MessageProcessorOptions
  ) {
    this.sessionManager = sessionManager;
    this.options = options;
  }

  configureContextUsageReader(config: ContextUsageReaderConfig): void {
    if (this.contextUsageReader) {
      return;
    }
    this.contextUsageReader = new ClaudeContextUsageReader(config);
    this.usageLimitsReader = new ClaudeUsageLimitsReader(config);
  }

  enqueueTurn(
    sessionId: string,
    turn: ClaudeQueuedTurn,
    hooks: ClaudeTurnProcessorHooks
  ): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    this.sessionManager.enqueueTurn(session.sessionId, turn);
    this.startQueueLoop(session, hooks);
  }

  private startQueueLoop(
    session: ActiveSession,
    hooks: ClaudeTurnProcessorHooks
  ): void {
    if (session.processingLoop) {
      return;
    }
    const loop = this.consumeTurnQueue(session, hooks)
      .catch((error) => {
        this.options.reporter?.error?.("Claude queue processing failed", error);
        session.eventEmitter.emit("error", { type: "processor", error });
      })
      .finally(() => {
        session.processingLoop = undefined;
        if (
          session.turnQueue &&
          session.turnQueue.pending.length > 0 &&
          !session.turnQueue.shutdownRequested
        ) {
          this.startQueueLoop(session, hooks);
        }
      });
    session.processingLoop = loop;
  }

  private async consumeTurnQueue(
    session: ActiveSession,
    hooks: ClaudeTurnProcessorHooks
  ): Promise<void> {
    const queueState = session.turnQueue;
    if (
      !(queueState && !queueState.processing && !queueState.shutdownRequested)
    ) {
      return;
    }
    queueState.processing = true;
    try {
      for (;;) {
        if (queueState.shutdownRequested) {
          return;
        }
        const turn = this.sessionManager.takeNextTurn(session.sessionId);
        if (!turn) {
          return;
        }
        this.sessionManager.beginTurn(session.sessionId, {
          internal: turn.internal,
        });
        session.structuredOutputUuids?.clear();
        try {
          this.send(session.sessionId, turn.content, {
            internal: turn.internal,
          });
          session.messageController.pendingMessages.length = 0;
          const iterator = hooks.createIterator({ session, turn });
          session.queryInstance = iterator;
          const processingSessionId = session.sessionId;
          await this.processResponses({
            sessionId: processingSessionId,
            iterator,
            onRealSessionId: (realSessionId) => {
              const previousSessionId = session.sessionId;
              if (!realSessionId || realSessionId === previousSessionId) {
                return;
              }
              hooks.onRealSessionId({
                session,
                previousSessionId,
                realSessionId,
              });
            },
          });
        } catch (error) {
          this.maybeEmitTurnFailed(session, error, session.sessionId);
          this.options.reporter?.error?.(
            "Claude turn processing failed",
            error
          );
          session.eventEmitter.emit("error", { type: "dispatch", error });
        } finally {
          this.sessionManager.clearInFlightTurn(session.sessionId);
          session.queryInstance = undefined;
        }
      }
    } finally {
      queueState.processing = false;
    }
  }

  send(
    sessionId: string,
    content: string,
    options?: { readonly internal?: boolean }
  ): void {
    const targetSession = this.sessionManager.getSession(sessionId);
    if (!targetSession) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const internal = options?.internal ?? false;
    if (!internal) {
      targetSession.logger?.logUserInput(content);
    }

    targetSession.messageController.pendingMessages.push({
      type: "user",
      message: {
        role: "user",
        content,
      },
    });

    if (targetSession.messageController.resolveNext) {
      const resolver = targetSession.messageController.resolveNext;
      targetSession.messageController.resolveNext = null;
      resolver(targetSession.messageController.pendingMessages.shift() ?? null);
    }
    if (!internal) {
      this.maybeEmitTurnStarted(targetSession, sessionId);
      targetSession.eventEmitter.emit("message", {
        type: "user_input",
        content,
        uuid: crypto.randomUUID(),
        claudeSessionId: sessionId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async processResponses(options: ProcessResponseOptions): Promise<void> {
    let promotedSessionId: string | null = null;
    try {
      for await (const message of options.iterator) {
        const activeSession = this.resolveSession(
          options.sessionId,
          promotedSessionId
        );
        if (!promotedSessionId && message.session_id) {
          promotedSessionId = message.session_id;
          activeSession?.eventEmitter.emit("realSessionId", promotedSessionId);
          options.onRealSessionId(promotedSessionId);
        }
        await this.dispatchMessage(activeSession, message);
      }
      const session = this.resolveSession(options.sessionId, promotedSessionId);
      if (session) {
        this.maybeEmitTurnFailed(
          session,
          new Error("Claude stream ended without result"),
          promotedSessionId ?? options.sessionId
        );
      }
    } catch (error) {
      const session = this.resolveSession(options.sessionId, promotedSessionId);
      if (session) {
        this.maybeEmitTurnFailed(
          session,
          error,
          promotedSessionId ?? options.sessionId
        );
      }
      session?.eventEmitter.emit("error", { type: "processing", error });
      this.options.reporter?.error?.("Claude stream processing failed", error);
    }
  }

  private resolveSession(
    tempId: string,
    promotedId: string | null
  ): ActiveSession | undefined {
    return (
      this.sessionManager.getSession(tempId) ??
      (promotedId ? this.sessionManager.getSession(promotedId) : undefined)
    );
  }

  private async dispatchMessage(
    session: ActiveSession | undefined,
    message: ClaudeStreamMessage
  ): Promise<void> {
    const emitter = session?.eventEmitter;
    if (!emitter) {
      return;
    }

    if (!shouldSkipSDKMessageLog(message)) {
      session?.logger?.logSDKMessage(message.type, message);
    }

    switch (message.type) {
      case "assistant": {
        this.handleAssistantMessage(session, message);
        break;
      }
      case "result": {
        await this.handleResultLifecycle(session, message);
        break;
      }
      default:
        break;
    }
  }

  private async handleResultLifecycle(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
    this.emitThinkingChunks(session, message);
    this.handleResultMessage(session, message);
    const tokenUsage = await this.refreshTokenUsageFromContext(
      session,
      message.session_id,
      { force: true }
    );
    // If the /context probe failed (e.g. five-hour rate limit), fall back to the
    // token counts embedded in the SDK result message itself. modelUsage contains
    // contextWindow (limit) and cumulative input/output/cache token counts.
    const resolvedTokenUsage =
      tokenUsage ?? extractTokenUsageFromResultMessage(message);
    const usageLimits = await this.refreshUsageLimitsFromUsage(
      session,
      message.session_id,
      { force: true }
    );
    this.maybeEmitTurnCompleted(session, message.session_id, {
      tokenUsage: resolvedTokenUsage,
      usageLimits,
    });
  }

  private maybeEmitTurnStarted(
    session: ActiveSession,
    claudeSessionId: string
  ): void {
    const queueState = session.turnQueue;
    if (
      !queueState ||
      queueState.internalTurn ||
      queueState.lifecycle.started ||
      queueState.lifecycle.ended
    ) {
      return;
    }
    queueState.lifecycle.started = true;
    session.eventEmitter.emit("message", {
      type: "turn_started",
      provider: "claude",
      sessionId: session.sessionId,
      claudeSessionId,
      uuid: `${crypto.randomUUID()}::turn_started`,
      timestamp: new Date().toISOString(),
    });
  }

  private maybeEmitTurnCompleted(
    session: ActiveSession,
    claudeSessionId: string | null | undefined,
    payload?: {
      readonly tokenUsage?: TokenUsageSnapshot | null;
      readonly usageLimits?: UsageLimitsSnapshot | null;
    }
  ): void {
    const queueState = session.turnQueue;
    if (!queueState || queueState.internalTurn || queueState.lifecycle.ended) {
      return;
    }
    const resolvedSessionId = claudeSessionId ?? session.sessionId;
    if (!queueState.lifecycle.started) {
      this.maybeEmitTurnStarted(session, resolvedSessionId);
    }
    queueState.lifecycle.ended = true;
    session.eventEmitter.emit("message", {
      type: "turn_completed",
      provider: "claude",
      sessionId: session.sessionId,
      claudeSessionId: resolvedSessionId,
      ...(payload?.tokenUsage
        ? {
            tokenUsage: payload.tokenUsage,
            usage: payload.tokenUsage,
          }
        : {}),
      ...(payload?.usageLimits ? { usageLimits: payload.usageLimits } : {}),
      uuid: `${crypto.randomUUID()}::turn_completed`,
      timestamp: new Date().toISOString(),
    });
  }

  private maybeEmitTurnFailed(
    session: ActiveSession,
    error: unknown,
    claudeSessionId: string | null | undefined
  ): void {
    const queueState = session.turnQueue;
    if (!queueState || queueState.internalTurn || queueState.lifecycle.ended) {
      return;
    }
    const resolvedSessionId = claudeSessionId ?? session.sessionId;
    if (!queueState.lifecycle.started) {
      this.maybeEmitTurnStarted(session, resolvedSessionId);
    }
    queueState.lifecycle.ended = true;
    const message = error instanceof Error ? error.message : String(error);
    session.eventEmitter.emit("message", {
      type: "turn_failed",
      provider: "claude",
      sessionId: session.sessionId,
      claudeSessionId: resolvedSessionId,
      message,
      error,
      uuid: `${crypto.randomUUID()}::turn_failed`,
      timestamp: new Date().toISOString(),
    });
  }

  private async refreshTokenUsageFromContext(
    session: ActiveSession,
    claudeSessionId: string | null | undefined,
    options: { readonly force?: boolean } = {}
  ): Promise<TokenUsageSnapshot | null> {
    const reader = this.contextUsageReader;
    if (!reader) {
      return null;
    }

    const resolvedId = this.resolveTokenUsageSessionId(
      session,
      claudeSessionId
    );
    if (!resolvedId) {
      return null;
    }

    const now = Date.now();
    const lastAttempt = this.contextUsageLastAttemptAt.get(resolvedId);
    if (
      !options.force &&
      lastAttempt &&
      now - lastAttempt < MIN_REFRESH_INTERVAL_MS
    ) {
      return null;
    }
    this.contextUsageLastAttemptAt.set(resolvedId, now);

    const inFlight = this.contextUsageInFlight.get(resolvedId);
    if (inFlight) {
      if (options.force) {
        await inFlight;
      }
      return this.tokenUsageCache.get(resolvedId) ?? null;
    }

    const refreshPromise = reader
      .read({ sessionId: resolvedId, cwd: session.workspacePath })
      .then((snapshot) => {
        if (!snapshot) {
          return null;
        }
        const { used, limit } = snapshot;
        const nextUsage = { used, limit } satisfies TokenUsageSnapshot;
        const previous = this.tokenUsageCache.get(resolvedId);
        if (previous && previous.used === used && previous.limit === limit) {
          return previous;
        }
        this.tokenUsageCache.set(resolvedId, nextUsage);
        session.eventEmitter.emit("message", {
          type: "stream_event",
          provider: "claude",
          sessionId: session.sessionId,
          claudeSessionId: resolvedId,
          tokenUsage: nextUsage,
          data: { kind: "token_usage", used, limit },
          uuid: `${crypto.randomUUID()}::token_usage`,
          timestamp: new Date().toISOString(),
        });
        return nextUsage;
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.options.reporter?.warn?.(
          `Claude /context token read failed (session ${resolvedId}): ${message}`
        );
        return null;
      })
      .finally(() => {
        this.contextUsageInFlight.delete(resolvedId);
      });

    this.contextUsageInFlight.set(resolvedId, refreshPromise);
    return await refreshPromise;
  }

  private async refreshUsageLimitsFromUsage(
    session: ActiveSession,
    claudeSessionId: string | null | undefined,
    options: { readonly force?: boolean } = {}
  ): Promise<UsageLimitsSnapshot | null> {
    const reader = this.usageLimitsReader;
    if (!reader) {
      return null;
    }

    const resolvedId = this.resolveTokenUsageSessionId(
      session,
      claudeSessionId
    );
    if (!resolvedId) {
      return null;
    }

    const now = Date.now();
    const lastAttempt = this.usageLimitsLastAttemptAt.get(resolvedId);
    if (
      !options.force &&
      lastAttempt &&
      now - lastAttempt < MIN_REFRESH_INTERVAL_MS
    ) {
      return null;
    }
    this.usageLimitsLastAttemptAt.set(resolvedId, now);

    const inFlight = this.usageLimitsInFlight.get(resolvedId);
    if (inFlight) {
      if (options.force) {
        await inFlight;
      }
      return this.usageLimitsCache.get(resolvedId) ?? null;
    }

    const refreshPromise = reader
      .read({ sessionId: resolvedId, cwd: session.workspacePath })
      .then((snapshot) => {
        if (!snapshot) {
          return null;
        }
        const nextUsage = normalizeUsageLimitsSnapshot(snapshot);
        const previous = this.usageLimitsCache.get(resolvedId);
        if (previous && areUsageLimitsEqual(previous, nextUsage)) {
          return previous;
        }
        this.usageLimitsCache.set(resolvedId, nextUsage);
        session.eventEmitter.emit("message", {
          type: "stream_event",
          provider: "claude",
          sessionId: session.sessionId,
          claudeSessionId: resolvedId,
          usageLimits: nextUsage,
          data: { kind: "usage_limits", usageLimits: nextUsage },
          uuid: `${crypto.randomUUID()}::usage_limits`,
          timestamp: new Date().toISOString(),
        });
        return nextUsage;
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.options.reporter?.warn?.(
          `Claude usage limits probe failed (session ${resolvedId}): ${message}`
        );
        return null;
      })
      .finally(() => {
        this.usageLimitsInFlight.delete(resolvedId);
      });

    this.usageLimitsInFlight.set(resolvedId, refreshPromise);
    return await refreshPromise;
  }

  private resolveTokenUsageSessionId(
    session: ActiveSession,
    claudeSessionId: string | null | undefined
  ): string | null {
    const candidate = claudeSessionId ?? session.sessionId;
    if (!candidate || candidate.startsWith(TEMP_SESSION_PREFIX)) {
      return null;
    }
    return candidate;
  }

  private handleAssistantMessage(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): void {
    this.emitThinkingChunks(session, message);
    const assistantText = this.extractAssistantText(message);
    if (!assistantText) {
      return;
    }
    const structured = parseIdeaCollectorOutputFromText(assistantText);
    if (structured) {
      const suggestedResponse = this.emitStructuredOutput(
        session,
        message,
        structured
      );
      const responseText = suggestedResponse ?? structured.suggestedResponse;
      if (responseText) {
        this.emitAssistantText(session, message, responseText);
      }
      return;
    }
    this.emitAssistantText(session, message, assistantText);
  }

  private handleResultMessage(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): void {
    const normalizedMessage = this.normalizeStructuredOutputMessage(message);
    const structured =
      parseIdeaCollectorOutputFromResultMessage(normalizedMessage);
    if (!structured) {
      return;
    }

    const suggestedResponse = this.emitStructuredOutput(
      session,
      normalizedMessage,
      structured
    );

    const responseText = suggestedResponse ?? structured.suggestedResponse;
    if (!responseText) {
      return;
    }

    this.emitAssistantText(session, message, responseText);
  }

  private normalizeStructuredOutputMessage(
    message: ClaudeStreamMessage
  ): ClaudeStreamMessage {
    const raw = message as Record<string, unknown>;
    const direct = readStructuredOutput(raw);
    if (direct) {
      return message;
    }

    const payload = isRecord(raw.payload) ? raw.payload : null;
    const payloadStructured = payload ? readStructuredOutput(payload) : null;
    if (payloadStructured) {
      return { ...message, structured_output: payloadStructured };
    }

    const result = isRecord(raw.result) ? raw.result : null;
    if (result) {
      const resultStructured = readStructuredOutput(result);
      if (resultStructured) {
        return { ...message, structured_output: resultStructured };
      }
      const resultPayload = isRecord(result.payload) ? result.payload : null;
      const resultPayloadStructured = resultPayload
        ? readStructuredOutput(resultPayload)
        : null;
      if (resultPayloadStructured) {
        return { ...message, structured_output: resultPayloadStructured };
      }
    }

    return message;
  }

  private emitAssistantText(
    session: ActiveSession,
    message: ClaudeStreamMessage,
    content: string
  ): void {
    session.eventEmitter.emit("message", {
      type: "assistant",
      content,
      uuid: message.uuid ?? crypto.randomUUID(),
      claudeSessionId: message.session_id,
      data: message,
      metadata: {
        uuid: message.uuid,
        session_id: message.session_id,
        model: message.message?.model,
      },
    });
  }

  private emitStructuredOutput(
    session: ActiveSession,
    message: ClaudeStreamMessage,
    output: IdeaCollectorStructuredOutput
  ): string | null {
    const variantBArtifacts = extractVariantBArtifacts(message);
    const { artifacts, questions } =
      partitionVariantBArtifacts(variantBArtifacts);
    const shouldEmitVariantB = Array.isArray(artifacts) && artifacts.length > 0;
    const suggestedResponse = appendQuestionsToSuggestedResponse(
      output.suggestedResponse,
      questions
    );
    if (
      !(
        shouldEmitVariantB ||
        questions.length > 0 ||
        (output.nextAction && output.artifact)
      )
    ) {
      return suggestedResponse;
    }
    const dedupeId = message.uuid;
    if (dedupeId) {
      if (!session.structuredOutputUuids) {
        session.structuredOutputUuids = new Set();
      }
      if (session.structuredOutputUuids.has(dedupeId)) {
        return suggestedResponse;
      }
      session.structuredOutputUuids.add(dedupeId);
    }
    session.eventEmitter.emit("message", {
      type: "stream_event",
      provider: "claude",
      sessionId: session.sessionId,
      claudeSessionId: message.session_id,
      data: {
        kind: "structured_output",
        artifact: output.artifact,
        artifacts: shouldEmitVariantB ? artifacts : undefined,
        nextAction: output.nextAction,
        suggested_response: suggestedResponse ?? undefined,
      },
      uuid: `${dedupeId ?? crypto.randomUUID()}::structured_output`,
      timestamp: new Date().toISOString(),
    });
    return suggestedResponse;
  }

  private emitThinkingChunks(
    session: ActiveSession | undefined,
    message: ClaudeStreamMessage
  ): void {
    if (!session) {
      return;
    }
    const content = message.message?.content;
    if (!Array.isArray(content)) {
      return;
    }
    for (const block of content) {
      if (
        block &&
        typeof block === "object" &&
        (block as { readonly type?: string }).type === "thinking" &&
        typeof (block as { readonly thinking?: unknown }).thinking === "string"
      ) {
        session.eventEmitter.emit("message", {
          type: "dialog_message",
          role: "thinking",
          content: (block as { readonly thinking: string }).thinking,
          uuid: `${message.uuid ?? crypto.randomUUID()}::thinking`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private extractAssistantText(message: ClaudeStreamMessage): string | null {
    const blocks = message.message?.content;
    if (!Array.isArray(blocks)) {
      return null;
    }
    const parts: string[] = [];
    for (const block of blocks) {
      if (!block || typeof block !== "object") {
        continue;
      }
      const kind = (block as { readonly type?: string }).type;
      if (
        kind === "text" &&
        typeof (block as { readonly text?: unknown }).text === "string"
      ) {
        parts.push((block as { readonly text: string }).text);
      } else if (
        kind === "output_text" &&
        typeof (block as { readonly output_text?: unknown }).output_text ===
          "string"
      ) {
        parts.push((block as { readonly output_text: string }).output_text);
      }
    }
    if (parts.length === 0) {
      return null;
    }
    return parts.join("\n\n");
  }
}
