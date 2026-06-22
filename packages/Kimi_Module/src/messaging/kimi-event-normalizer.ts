import crypto from "node:crypto";
import type { KimiSessionEvent } from "../provider/kimi-provider-adapter";

interface WireEventEnvelope {
  readonly method?: unknown;
  readonly params?: unknown;
  readonly payload?: unknown;
  readonly type?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const THINKING_STREAM_FLUSH_MIN_CHARS = 900;
const THINKING_STREAM_BOUNDARY_MIN_CHARS = 360;
const THINKING_STREAM_BOUNDARY_REGEX = /(?:\n\n|[.!?。！？]\s*)$/u;

const shouldFlushThinkingStreamChunk = (content: string): boolean => {
  if (content.length >= THINKING_STREAM_FLUSH_MIN_CHARS) {
    return true;
  }
  return (
    content.length >= THINKING_STREAM_BOUNDARY_MIN_CHARS &&
    THINKING_STREAM_BOUNDARY_REGEX.test(content.trimEnd())
  );
};

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number.parseFloat(value.trim().replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const createEvent = (
  eventType: string,
  payload?: Record<string, unknown>
): KimiSessionEvent => ({
  payload: {
    provider: "kimi",
    timestamp: new Date().toISOString(),
    uuid: `${crypto.randomUUID()}::${eventType}`,
    ...(payload ?? {}),
  },
  type: eventType,
});

const createTurnCompletedEvent = (): KimiSessionEvent & {
  readonly postTurnTokenUsageUnavailable: true;
} => ({
  ...createEvent("turn_completed"),
  postTurnTokenUsageUnavailable: true,
});

type KimiMessageEvent = KimiSessionEvent & {
  readonly content: string;
  readonly tag?: string;
  readonly timestamp: string;
};

type KimiStreamEvent = KimiSessionEvent & {
  readonly data: Record<string, unknown>;
  readonly timestamp: string;
};

const createMessageEvent = (
  eventType: "assistant" | "thinking",
  content: string,
  payload?: Record<string, unknown>
): KimiMessageEvent => {
  const timestamp = new Date().toISOString();
  const payloadTag = typeof payload?.tag === "string" ? payload.tag : undefined;
  const tag = eventType === "thinking" ? "thinking" : payloadTag;
  return {
    content,
    payload: {
      content,
      provider: "kimi",
      text: content,
      timestamp,
      uuid: `${crypto.randomUUID()}::${eventType}`,
      ...(tag ? { tag } : {}),
      ...(payload ?? {}),
    },
    tag,
    timestamp,
    type: eventType,
  };
};

const createStreamEvent = (
  phase: string,
  payload?: Record<string, unknown>
): KimiStreamEvent => {
  const timestamp = new Date().toISOString();
  const data = {
    kind: "kimi_wire_progress",
    phase,
    provider: "kimi",
    timestamp,
    ...(payload ?? {}),
  };
  return {
    data,
    payload: data,
    timestamp,
    type: "stream_event",
  };
};

const isAcpSessionUpdateMessage = (params: Record<string, unknown>): boolean =>
  params.method === "session/update";

const readAcpUpdatePayload = (
  params: Record<string, unknown>
): Record<string, unknown> | null => {
  const rawParams = isRecord(params.params) ? params.params : params;
  return isRecord(rawParams.update) ? rawParams.update : null;
};

const readAcpToolPayload = (
  update: Record<string, unknown>
): Record<string, unknown> => ({
  raw: update,
  ...(typeof update.status === "string" ? { status: update.status } : {}),
  ...(typeof update.title === "string" ? { toolName: update.title } : {}),
  ...(typeof update.toolCallId === "string"
    ? { toolCallId: update.toolCallId }
    : {}),
});

const readAcpUsagePayload = (
  update: Record<string, unknown>
): Record<string, unknown> => {
  const used = readNumber(update.used);
  const limit = readNumber(update.size);
  return {
    raw: update,
    ...(used !== null && limit !== null && limit > 0
      ? {
          contextUsage: used / limit,
          tokenUsage: { limit, used },
        }
      : {}),
  };
};

const normalizeContextUsageRatio = (value: unknown): number | null => {
  const numeric = readNumber(value);
  if (numeric === null) {
    return null;
  }
  if (numeric >= 0 && numeric <= 1) {
    return numeric;
  }
  if (numeric > 1 && numeric <= 100) {
    return numeric / 100;
  }
  return null;
};

const readContextTokenUsage = (payload: unknown): Record<string, unknown> => {
  if (!isRecord(payload)) {
    return { raw: payload };
  }
  const limit = readNumber(payload.max_context_tokens);
  const directUsed = readNumber(payload.context_tokens);
  const contextUsage = normalizeContextUsageRatio(payload.context_usage);
  const computedUsed =
    directUsed ??
    (limit !== null && contextUsage !== null
      ? Math.round(limit * contextUsage)
      : null);
  const tokenUsage =
    computedUsed !== null && limit !== null && limit > 0
      ? {
          limit,
          used: computedUsed,
        }
      : null;

  return {
    raw: payload,
    ...(contextUsage === null ? {} : { contextUsage }),
    ...(tokenUsage ? { tokenUsage } : {}),
  };
};

export const normalizeKimiWireEvent = (
  params: unknown
): readonly KimiSessionEvent[] => {
  if (!isRecord(params)) {
    return [createEvent("kimi_wire_event", { raw: params })];
  }

  const envelope = params as WireEventEnvelope;
  switch (envelope.type) {
    case "TurnBegin":
      return [createEvent("turn_started")];
    case "TurnEnd":
      return [createTurnCompletedEvent()];
    case "StepBegin":
      return [
        createEvent("step_started"),
        createStreamEvent("step_started", readStepPayload(envelope.payload)),
      ];
    case "StatusUpdate":
      return [
        createEvent("status_update", { raw: envelope.payload }),
        createStreamEvent(
          "status_update",
          readContextTokenUsage(envelope.payload)
        ),
      ];
    case "ToolCall":
      return [
        createStreamEvent("tool_call", readToolPayload(envelope.payload)),
      ];
    case "ToolResult":
      return [
        createStreamEvent(
          "tool_result",
          readToolResultPayload(envelope.payload)
        ),
      ];
    case "ContentPart":
      return normalizeContentPart(envelope.payload);
    default:
      return [
        createEvent("kimi_wire_event", {
          raw: params,
          wireType: typeof envelope.type === "string" ? envelope.type : null,
        }),
      ];
  }
};

const normalizeContentPart = (
  payload: unknown
): readonly KimiSessionEvent[] => {
  if (!isRecord(payload)) {
    return [createEvent("kimi_wire_event", { raw: payload })];
  }
  if (payload.type === "text") {
    const text = typeof payload.text === "string" ? payload.text : "";
    return text.length > 0 ? [createMessageEvent("assistant", text)] : [];
  }
  if (payload.type === "think") {
    const thinking = typeof payload.think === "string" ? payload.think : "";
    return thinking.length > 0
      ? [createMessageEvent("thinking", thinking)]
      : [];
  }
  return [createEvent("kimi_wire_event", { raw: payload })];
};

const readStepPayload = (payload: unknown): Record<string, unknown> => {
  if (!isRecord(payload)) {
    return {};
  }
  return typeof payload.n === "number" ? { step: payload.n } : {};
};

const readToolPayload = (payload: unknown): Record<string, unknown> => {
  if (!isRecord(payload)) {
    return {};
  }
  const toolType = typeof payload.type === "string" ? payload.type : undefined;
  const functionRecord = isRecord(payload.function) ? payload.function : null;
  const toolName =
    typeof functionRecord?.name === "string" ? functionRecord.name : undefined;
  return {
    ...(toolName ? { toolName } : {}),
    ...(toolType ? { toolType } : {}),
  };
};

const readToolResultPayload = (payload: unknown): Record<string, unknown> => {
  if (!isRecord(payload)) {
    return {};
  }
  const returnValue = isRecord(payload.return_value)
    ? payload.return_value
    : null;
  return {
    isError: returnValue?.is_error === true,
  };
};

type KimiWireFallbackNormalizer = (
  params: unknown
) => readonly KimiSessionEvent[];

export class KimiWireEventNormalizer {
  private readonly assistantChunks: string[] = [];
  private readonly fallbackNormalizer: KimiWireFallbackNormalizer;
  private readonly thinkingChunks: string[] = [];

  constructor(
    fallbackNormalizer: KimiWireFallbackNormalizer = normalizeKimiWireEvent
  ) {
    this.fallbackNormalizer = fallbackNormalizer;
  }

  normalize(params: unknown): readonly KimiSessionEvent[] {
    if (!isRecord(params)) {
      return this.fallbackNormalizer(params);
    }
    if (isAcpSessionUpdateMessage(params)) {
      return this.bufferAcpSessionUpdate(params);
    }

    const envelope = params as WireEventEnvelope;
    switch (envelope.type) {
      case "TurnBegin":
        this.reset();
        return [createEvent("turn_started")];
      case "TurnEnd":
        return [...this.flushMessages(), createTurnCompletedEvent()];
      case "StepBegin":
        return [
          ...this.flushMessages(),
          createEvent("step_started"),
          createStreamEvent("step_started", readStepPayload(envelope.payload)),
        ];
      case "StatusUpdate":
        return [
          createEvent("status_update", { raw: envelope.payload }),
          createStreamEvent(
            "status_update",
            readContextTokenUsage(envelope.payload)
          ),
        ];
      case "ToolCall":
        return [
          ...this.flushMessages(),
          createStreamEvent("tool_call", readToolPayload(envelope.payload)),
        ];
      case "ToolResult":
        return [
          createStreamEvent(
            "tool_result",
            readToolResultPayload(envelope.payload)
          ),
        ];
      case "ContentPart":
        return this.bufferContentPart(envelope.payload);
      default:
        return this.fallbackNormalizer(params);
    }
  }

  flushPendingMessages(): readonly KimiSessionEvent[] {
    return this.flushMessages();
  }

  private bufferAcpSessionUpdate(
    params: Record<string, unknown>
  ): readonly KimiSessionEvent[] {
    const update = readAcpUpdatePayload(params);
    if (!update) {
      return [createEvent("kimi_acp_event", { raw: params })];
    }
    switch (update.sessionUpdate) {
      case "agent_message_chunk":
        return [
          ...this.flushBufferedMessage("thinking"),
          ...this.bufferAcpTextChunk(update, "assistant"),
        ];
      case "agent_thought_chunk":
        return this.bufferAcpTextChunk(update, "thinking");
      case "tool_call":
        return [
          ...this.flushMessages(),
          createStreamEvent("tool_call", readAcpToolPayload(update)),
        ];
      case "tool_call_update":
        return [
          ...this.flushMessages(),
          createStreamEvent("tool_result", readAcpToolPayload(update)),
        ];
      case "usage_update":
        return [
          createStreamEvent("status_update", readAcpUsagePayload(update)),
        ];
      default:
        return [
          ...this.flushMessages(),
          createStreamEvent(String(update.sessionUpdate ?? "session_update"), {
            raw: update,
          }),
        ];
    }
  }

  private bufferAcpTextChunk(
    update: Record<string, unknown>,
    eventType: "assistant" | "thinking"
  ): readonly KimiSessionEvent[] {
    const content = isRecord(update.content) ? update.content : null;
    const text = typeof content?.text === "string" ? content.text : "";
    return this.bufferText(text, eventType);
  }

  private bufferContentPart(payload: unknown): readonly KimiSessionEvent[] {
    if (!isRecord(payload)) {
      return [createEvent("kimi_wire_event", { raw: payload })];
    }
    if (payload.type === "text") {
      const text = typeof payload.text === "string" ? payload.text : "";
      return this.bufferText(text, "assistant");
    }
    if (payload.type === "think") {
      const thinking = typeof payload.think === "string" ? payload.think : "";
      return this.bufferText(thinking, "thinking");
    }
    return [createEvent("kimi_wire_event", { raw: payload })];
  }

  private bufferText(
    text: string,
    eventType: "assistant" | "thinking"
  ): readonly KimiSessionEvent[] {
    if (text.length === 0) {
      return [];
    }
    const chunks =
      eventType === "thinking" ? this.thinkingChunks : this.assistantChunks;
    chunks.push(text);
    return this.flushBufferedMessage(eventType, false);
  }

  private flushMessages(): readonly KimiSessionEvent[] {
    return [
      ...this.flushBufferedMessage("thinking"),
      ...this.flushBufferedMessage("assistant"),
    ];
  }

  private flushBufferedMessage(
    eventType: "assistant" | "thinking",
    force = true
  ): readonly KimiSessionEvent[] {
    const chunks =
      eventType === "thinking" ? this.thinkingChunks : this.assistantChunks;
    const content = chunks.join("");
    if (!(force || shouldFlushThinkingStreamChunk(content))) {
      return [];
    }
    chunks.length = 0;
    return content.trim().length > 0
      ? [
          createMessageEvent(
            eventType,
            content,
            eventType === "assistant" ? { tag: "live" } : undefined
          ),
        ]
      : [];
  }

  private reset(): void {
    this.assistantChunks.length = 0;
    this.thinkingChunks.length = 0;
  }
}
