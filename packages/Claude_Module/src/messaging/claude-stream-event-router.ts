import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage, ModuleReporter } from "../types";
import {
  emitClaudeThinkingDialog,
  isClaudeMessageStopEvent,
  readClaudeMessageDeltaStopReason,
  readClaudeMessageId,
} from "./claude-thinking-dialog-emitter";
import {
  type ClaudeTextTranslationAdapter,
  ClaudeThoughtTranslationAdapter,
} from "./claude-thought-translation-adapter";
import { extractVariantBArtifacts } from "./structured-output-utils";
import {
  parseWorkflowStructuredOutputFromResultMessage,
  parseWorkflowStructuredOutputFromText,
  type WorkflowStructuredOutput,
} from "./workflow-structured-output";

const QUESTION_SLOT_PATTERN = /^question\d*$/i;
type VariantBArtifact =
  ReturnType<typeof extractVariantBArtifacts> extends (infer Item)[] | null
    ? Item
    : never;

interface VariantBPartition {
  readonly artifacts?: VariantBArtifact[];
  readonly questions: string[];
}

interface PendingAssistantText {
  readonly content: string;
  readonly message: ClaudeStreamMessage;
  readonly messageId: string | null;
  readonly semanticRole: "assistant" | "thinking";
}

type PendingAssistantTextResolution = "regular" | "tool_use_preamble";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const readStructuredOutput = (source: Record<string, unknown>) => {
  const candidate = source.structured_output ?? source.structuredOutput;
  return isRecord(candidate) ? candidate : null;
};

export const shouldSkipClaudeSDKMessageLog = (
  message: ClaudeStreamMessage
): boolean =>
  message.type === "stream_event" &&
  isRecord(message.event) &&
  message.event.type === "content_block_delta";

export class ClaudeStreamEventRouter {
  private readonly pendingAssistantTextBySession = new Map<
    string,
    PendingAssistantText
  >();
  private readonly thinkingMessageIdBySession = new Map<string, string>();
  private readonly thoughtTranslator: ClaudeTextTranslationAdapter;

  constructor(
    reporter?: ModuleReporter,
    thoughtTranslator?: ClaudeTextTranslationAdapter
  ) {
    this.thoughtTranslator =
      thoughtTranslator ?? new ClaudeThoughtTranslationAdapter(reporter);
  }

  handleAssistantMessage(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
    return this.handleAssistantMessageInternal(session, message);
  }

  handleStreamEvent(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
    return this.handleStreamEventInternal(session, message);
  }

  private async handleAssistantMessageInternal(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
    await this.emitThinkingChunks(session, message);
    const assistantText = this.extractAssistantText(message);
    if (!assistantText) {
      return;
    }
    await this.queueAssistantText(session, message, assistantText);
  }

  handleResultMessage(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
    return this.handleResultMessageInternal(session, message);
  }

  private async handleResultMessageInternal(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
    await this.flushPendingAssistantText(session, "regular");
    this.clearThinkingMessage(session);
    await this.emitThinkingChunks(session, message);
    const normalizedMessage = this.normalizeStructuredOutputMessage(message);
    const structured =
      parseWorkflowStructuredOutputFromResultMessage(normalizedMessage);
    if (!structured) {
      return;
    }
    const suggestedResponse = this.emitStructuredOutput(
      session,
      normalizedMessage,
      structured
    );
    const responseText = suggestedResponse ?? structured.suggestedResponse;
    if (responseText) {
      this.emitAssistantText(session, message, responseText);
    }
  }

  private async handleStreamEventInternal(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
    const stopReason = readClaudeMessageDeltaStopReason(message);
    if (stopReason === "tool_use") {
      await this.flushPendingAssistantText(session, "tool_use_preamble");
      this.clearThinkingMessage(session);
      return;
    }
    if (stopReason) {
      await this.flushPendingAssistantText(session, "regular");
      this.clearThinkingMessage(session);
      return;
    }
    if (isClaudeMessageStopEvent(message)) {
      await this.flushPendingAssistantText(session, "regular");
      this.clearThinkingMessage(session);
    }
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
    if (!result) {
      return message;
    }

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
      uuid: message.uuid ?? globalThis.crypto.randomUUID(),
      claudeSessionId: message.session_id,
      data: message,
      metadata: {
        uuid: message.uuid,
        session_id: message.session_id,
        model: message.message?.model,
      },
    });
  }

  private async queueAssistantText(
    session: ActiveSession,
    message: ClaudeStreamMessage,
    content: string
  ): Promise<void> {
    const sessionKey = session.sessionId;
    const pending = this.pendingAssistantTextBySession.get(sessionKey);
    const messageId = readClaudeMessageId(message);
    const semanticRole =
      messageId && this.thinkingMessageIdBySession.get(sessionKey) === messageId
        ? "thinking"
        : "assistant";

    if (pending?.messageId && messageId && pending.messageId === messageId) {
      this.pendingAssistantTextBySession.set(sessionKey, {
        content: `${pending.content}\n\n${content}`,
        message,
        messageId,
        semanticRole:
          pending.semanticRole === "thinking" || semanticRole === "thinking"
            ? "thinking"
            : "assistant",
      });
      return;
    }

    if (pending) {
      await this.flushPendingAssistantText(session, "regular");
    }

    this.pendingAssistantTextBySession.set(sessionKey, {
      content,
      message,
      messageId,
      semanticRole,
    });
  }

  private async flushPendingAssistantText(
    session: ActiveSession,
    resolution: PendingAssistantTextResolution
  ): Promise<void> {
    const sessionKey = session.sessionId;
    const pending = this.pendingAssistantTextBySession.get(sessionKey);
    if (!pending) {
      return;
    }
    this.pendingAssistantTextBySession.delete(sessionKey);

    const content = await this.resolvePendingAssistantText(
      session,
      pending,
      resolution
    );
    if (!content) {
      return;
    }

    if (resolution === "tool_use_preamble") {
      if (pending.semanticRole === "thinking") {
        emitClaudeThinkingDialog(
          session,
          pending.message,
          content,
          "thinking_text"
        );
        return;
      }
      this.emitAssistantText(session, pending.message, content);
      return;
    }

    const structured = parseWorkflowStructuredOutputFromText(content);
    if (!structured) {
      this.emitAssistantText(session, pending.message, content);
      return;
    }
    const suggestedResponse = this.emitStructuredOutput(
      session,
      pending.message,
      structured
    );
    const responseText = suggestedResponse ?? structured.suggestedResponse;
    if (responseText) {
      this.emitAssistantText(session, pending.message, responseText);
    }
  }

  private async resolvePendingAssistantText(
    session: ActiveSession,
    pending: PendingAssistantText,
    resolution: PendingAssistantTextResolution
  ): Promise<string | null> {
    if (resolution !== "tool_use_preamble") {
      return pending.content;
    }

    const translated =
      pending.semanticRole === "thinking"
        ? await this.thoughtTranslator.translateReasoning(
            pending.content,
            session.runtimeTurnConfig.messagesForTheUserLanguage
          )
        : await this.thoughtTranslator.translateUserFacingText(
            pending.content,
            session.runtimeTurnConfig.messagesForTheUserLanguage
          );
    return translated ?? pending.content;
  }

  private emitStructuredOutput(
    session: ActiveSession,
    message: ClaudeStreamMessage,
    output: WorkflowStructuredOutput
  ): string | null {
    const { artifacts, questions } = partitionVariantBArtifacts(
      extractVariantBArtifacts(message)
    );
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

  private async emitThinkingChunks(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
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
        const messageId = readClaudeMessageId(message);
        if (messageId) {
          this.thinkingMessageIdBySession.set(session.sessionId, messageId);
        }
        const thinking = (block as { readonly thinking: string }).thinking;
        const translated = await this.thoughtTranslator.translateReasoning(
          thinking,
          session.runtimeTurnConfig.messagesForTheUserLanguage
        );
        emitClaudeThinkingDialog(
          session,
          message,
          translated ?? thinking,
          "thinking"
        );
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
        continue;
      }

      if (
        kind === "output_text" &&
        typeof (block as { readonly output_text?: unknown }).output_text ===
          "string"
      ) {
        parts.push((block as { readonly output_text: string }).output_text);
      }
    }

    return parts.length > 0 ? parts.join("\n\n") : null;
  }

  private clearThinkingMessage(session: ActiveSession): void {
    this.thinkingMessageIdBySession.delete(session.sessionId);
  }
}
