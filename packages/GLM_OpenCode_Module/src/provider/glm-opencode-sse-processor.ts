import { randomUUID } from "node:crypto";
import type { GlmOpenCodeSessionEvent } from "./glm-opencode-output-normalizer";
import {
  emitOpenCodeThinkingChunk,
  shouldFlushOpenCodeReasoningBuffer,
} from "./glm-opencode-stream-helpers";

export interface OpenCodeEventPayload {
  readonly properties?: Record<string, unknown>;
  readonly type?: unknown;
}

interface MessageInfoRecord {
  readonly id?: unknown;
  readonly role?: unknown;
  readonly sessionID?: unknown;
}

interface MessagePartRecord {
  readonly id?: unknown;
  readonly messageID?: unknown;
  readonly sessionID?: unknown;
  readonly text?: unknown;
  readonly type?: unknown;
}

export interface AssistantPartAccumulator {
  readonly liveAssistantSeenByPartId: Map<string, string>;
  readonly liveReasoningBufferByPartId: Map<string, string>;
  readonly liveReasoningSeenByPartId: Map<string, string>;
  readonly partTypeByPartId: Map<string, string>;
  readonly reasoningOrder: string[];
  readonly reasoningTextByPartId: Map<string, string>;
  readonly streamedReasoningPartIds: Set<string>;
  readonly textByPartId: Map<string, string>;
  readonly textOrder: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRawText = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readMessageInfo = (
  payload: OpenCodeEventPayload
): MessageInfoRecord | null => {
  const properties = payload.properties;
  if (!(isRecord(properties) && isRecord(properties.info))) {
    return null;
  }
  return properties.info as MessageInfoRecord;
};

const readMessagePart = (
  payload: OpenCodeEventPayload
): MessagePartRecord | null => {
  const properties = payload.properties;
  if (!(isRecord(properties) && isRecord(properties.part))) {
    return null;
  }
  return properties.part as MessagePartRecord;
};

const readEventDelta = (payload: OpenCodeEventPayload): string | null => {
  const properties = payload.properties;
  return isRecord(properties) ? readRawText(properties.delta) : null;
};

const buildSessionError = (
  payload: OpenCodeEventPayload,
  sessionId: string
): string | null => {
  if (payload.type !== "session.error") {
    return null;
  }
  const properties = payload.properties;
  if (!isRecord(properties) || readString(properties.sessionID) !== sessionId) {
    return null;
  }
  const error = properties.error;
  if (typeof error === "string") {
    return error;
  }
  if (!isRecord(error)) {
    return "OpenCode reported an unknown session error.";
  }
  return (
    readString(error.message) ??
    readString(error.name) ??
    "OpenCode reported an unknown session error."
  );
};

const appendOrderedText = (
  order: string[],
  textByPartId: Map<string, string>,
  partId: string,
  text: string
): void => {
  if (!textByPartId.has(partId)) {
    order.push(partId);
  }
  textByPartId.set(partId, text);
};

const collectOrderedText = (
  order: readonly string[],
  textByPartId: ReadonlyMap<string, string>
): string =>
  order
    .map((partId) => textByPartId.get(partId) ?? "")
    .filter((text) => text.length > 0)
    .join("");

const flushReasoningBuffer = (
  accumulator: AssistantPartAccumulator,
  onEvent: (event: GlmOpenCodeSessionEvent) => void,
  partId: string,
  force: boolean
): void => {
  const buffer = accumulator.liveReasoningBufferByPartId.get(partId) ?? "";
  if (buffer.length === 0) {
    return;
  }
  if (!(force || shouldFlushOpenCodeReasoningBuffer(buffer))) {
    return;
  }
  accumulator.liveReasoningBufferByPartId.set(partId, "");
  accumulator.streamedReasoningPartIds.add(partId);
  emitOpenCodeThinkingChunk(buffer, onEvent);
};

const ingestReasoningTail = (
  accumulator: AssistantPartAccumulator,
  onEvent: (event: GlmOpenCodeSessionEvent) => void,
  partId: string,
  tail: string | null
): void => {
  if (!tail) {
    return;
  }
  const nextBuffer =
    (accumulator.liveReasoningBufferByPartId.get(partId) ?? "") + tail;
  accumulator.liveReasoningBufferByPartId.set(partId, nextBuffer);
  const nextSeen =
    (accumulator.liveReasoningSeenByPartId.get(partId) ?? "") + tail;
  accumulator.liveReasoningSeenByPartId.set(partId, nextSeen);
  flushReasoningBuffer(accumulator, onEvent, partId, false);
};

const handleMessageUpdated = (params: {
  readonly assistantMessageIds: Set<string>;
  readonly payload: OpenCodeEventPayload;
  readonly remoteSessionId: string;
}): boolean => {
  const info = readMessageInfo(params.payload);
  if (
    !info ||
    readString(info.sessionID) !== params.remoteSessionId ||
    readString(info.role) !== "assistant"
  ) {
    return false;
  }
  const assistantMessageId = readString(info.id);
  if (!assistantMessageId) {
    return false;
  }
  params.assistantMessageIds.add(assistantMessageId);
  return true;
};

export const resolveOpenCodeUnseenTextTail = (
  previousText: string,
  nextText: string,
  delta: string | null
): string | null => {
  if (delta && delta.length > 0) {
    return delta;
  }
  if (nextText.length === 0 || nextText === previousText) {
    return null;
  }
  if (previousText.length === 0 || !nextText.startsWith(previousText)) {
    return nextText;
  }
  const unseen = nextText.slice(previousText.length);
  return unseen.length > 0 ? unseen : null;
};

const handleAssistantPartUpdated = (params: {
  readonly accumulator: AssistantPartAccumulator;
  readonly assistantMessageIds: Set<string>;
  readonly onEvent: (event: GlmOpenCodeSessionEvent) => void;
  readonly payload: OpenCodeEventPayload;
}): boolean => {
  const part = readMessagePart(params.payload);
  const partId = readString(part?.id);
  const messageId = readString(part?.messageID);
  const partType = readString(part?.type);
  if (!(partId && messageId && partType)) {
    return false;
  }
  if (!params.assistantMessageIds.has(messageId)) {
    return false;
  }
  params.accumulator.partTypeByPartId.set(partId, partType);
  const partText = typeof part?.text === "string" ? part.text : "";
  if (partType === "reasoning") {
    appendOrderedText(
      params.accumulator.reasoningOrder,
      params.accumulator.reasoningTextByPartId,
      partId,
      partText
    );
    const previousReasoningText =
      params.accumulator.liveReasoningSeenByPartId.get(partId) ?? "";
    const reasoningTail = resolveOpenCodeUnseenTextTail(
      previousReasoningText,
      partText,
      readEventDelta(params.payload)
    );
    ingestReasoningTail(
      params.accumulator,
      params.onEvent,
      partId,
      reasoningTail
    );
    return true;
  }
  if (partType !== "text") {
    return false;
  }
  appendOrderedText(
    params.accumulator.textOrder,
    params.accumulator.textByPartId,
    partId,
    partText
  );
  const previousLiveText =
    params.accumulator.liveAssistantSeenByPartId.get(partId) ?? "";
  const liveTail = resolveOpenCodeUnseenTextTail(
    previousLiveText,
    partText,
    readEventDelta(params.payload)
  );
  if (!liveTail) {
    return true;
  }
  params.accumulator.liveAssistantSeenByPartId.set(partId, partText);
  params.onEvent({
    content: liveTail,
    provider: "glmOpenCode",
    tag: "live",
    timestamp: new Date().toISOString(),
    type: "assistant",
    uuid: `${randomUUID()}::assistant_live`,
  });
  return true;
};

const handleAssistantPartDelta = (params: {
  readonly accumulator: AssistantPartAccumulator;
  readonly assistantMessageIds: Set<string>;
  readonly onEvent: (event: GlmOpenCodeSessionEvent) => void;
  readonly payload: OpenCodeEventPayload;
}): boolean => {
  const properties = params.payload.properties;
  if (!isRecord(properties)) {
    return false;
  }
  const partId = readString(properties.partID);
  const messageId = readString(properties.messageID);
  const delta = readRawText(properties.delta);
  const field = readString(properties.field);
  if (!(partId && messageId) || field !== "text") {
    return false;
  }
  if (!params.assistantMessageIds.has(messageId)) {
    return false;
  }
  const partType = params.accumulator.partTypeByPartId.get(partId);
  if (partType === "reasoning") {
    ingestReasoningTail(params.accumulator, params.onEvent, partId, delta);
    return true;
  }
  if (partType !== "text" || !delta) {
    return false;
  }
  const previousLiveText =
    params.accumulator.liveAssistantSeenByPartId.get(partId) ?? "";
  params.accumulator.liveAssistantSeenByPartId.set(
    partId,
    previousLiveText + delta
  );
  params.onEvent({
    content: delta,
    provider: "glmOpenCode",
    tag: "live",
    timestamp: new Date().toISOString(),
    type: "assistant",
    uuid: `${randomUUID()}::assistant_live`,
  });
  return true;
};

export const createAssistantPartAccumulator = (): AssistantPartAccumulator => ({
  liveAssistantSeenByPartId: new Map<string, string>(),
  liveReasoningBufferByPartId: new Map<string, string>(),
  liveReasoningSeenByPartId: new Map<string, string>(),
  partTypeByPartId: new Map<string, string>(),
  reasoningOrder: [],
  reasoningTextByPartId: new Map<string, string>(),
  streamedReasoningPartIds: new Set<string>(),
  textByPartId: new Map<string, string>(),
  textOrder: [],
});

export const emitFinalOpenCodeAssistantArtifacts = (
  accumulator: AssistantPartAccumulator,
  onEvent: (event: GlmOpenCodeSessionEvent) => void
): void => {
  for (const partId of accumulator.reasoningOrder) {
    flushReasoningBuffer(accumulator, onEvent, partId, true);
    if (accumulator.streamedReasoningPartIds.has(partId)) {
      continue;
    }
    emitOpenCodeThinkingChunk(
      accumulator.reasoningTextByPartId.get(partId) ?? "",
      onEvent
    );
  }
  const assistantText = collectOrderedText(
    accumulator.textOrder,
    accumulator.textByPartId
  );
  if (assistantText.trim().length === 0) {
    return;
  }
  onEvent({
    content: assistantText,
    provider: "glmOpenCode",
    timestamp: new Date().toISOString(),
    type: "assistant",
    uuid: `${randomUUID()}::assistant_final`,
  });
};

export const processOpenCodeSsePayload = (params: {
  readonly accumulator: AssistantPartAccumulator;
  readonly assistantMessageIds: Set<string>;
  readonly onEvent: (event: GlmOpenCodeSessionEvent) => void;
  readonly payload: OpenCodeEventPayload;
  readonly remoteSessionId: string;
}): "completed" | "continue" => {
  if (
    params.payload.type === "message.updated" &&
    handleMessageUpdated(params)
  ) {
    return "continue";
  }
  if (
    params.payload.type === "message.part.updated" &&
    handleAssistantPartUpdated(params)
  ) {
    return "continue";
  }
  if (
    params.payload.type === "message.part.delta" &&
    handleAssistantPartDelta(params)
  ) {
    return "continue";
  }
  const sessionError = buildSessionError(
    params.payload,
    params.remoteSessionId
  );
  if (sessionError) {
    throw new Error(sessionError);
  }
  if (
    params.payload.type === "session.idle" &&
    isRecord(params.payload.properties) &&
    readString(params.payload.properties.sessionID) === params.remoteSessionId
  ) {
    return "completed";
  }
  return "continue";
};
