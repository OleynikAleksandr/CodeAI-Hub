import crypto from "node:crypto";
import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage } from "../types";
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
  handleAssistantMessage(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): void {
    this.emitThinkingChunks(session, message);
    const assistantText = this.extractAssistantText(message);
    if (!assistantText) {
      return;
    }

    const structured = parseWorkflowStructuredOutputFromText(assistantText);
    if (!structured) {
      this.emitAssistantText(session, message, assistantText);
      return;
    }
    const suggestedResponse = this.emitStructuredOutput(
      session,
      message,
      structured
    );
    const responseText = suggestedResponse ?? structured.suggestedResponse;
    if (responseText) {
      this.emitAssistantText(session, message, responseText);
    }
  }

  handleResultMessage(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): void {
    this.emitThinkingChunks(session, message);
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

  private emitThinkingChunks(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): void {
    if (session.runtimeTurnConfig.thinkingDisplaySyncEnabled === false) {
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
          role: "assistant",
          tag: "thinking",
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
}
