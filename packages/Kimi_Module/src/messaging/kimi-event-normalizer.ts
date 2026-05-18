import crypto from "node:crypto";
import type { KimiSessionEvent } from "../provider/kimi-provider-adapter";

interface WireEventEnvelope {
  readonly payload?: unknown;
  readonly type?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
  const tag = eventType === "thinking" ? "thinking" : undefined;
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
      return [createEvent("turn_completed")];
    case "StepBegin":
      return [
        createEvent("step_started"),
        createStreamEvent("step_started", readStepPayload(envelope.payload)),
      ];
    case "StatusUpdate":
      return [
        createEvent("status_update", { raw: envelope.payload }),
        createStreamEvent("status_update", { raw: envelope.payload }),
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

    const envelope = params as WireEventEnvelope;
    switch (envelope.type) {
      case "TurnBegin":
        this.reset();
        return [createEvent("turn_started")];
      case "TurnEnd":
        return [...this.flushMessages(), createEvent("turn_completed")];
      case "StepBegin":
        return [
          ...this.flushMessages(),
          createEvent("step_started"),
          createStreamEvent("step_started", readStepPayload(envelope.payload)),
        ];
      case "StatusUpdate":
        return [
          createEvent("status_update", { raw: envelope.payload }),
          createStreamEvent("status_update", { raw: envelope.payload }),
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

  private bufferContentPart(payload: unknown): readonly KimiSessionEvent[] {
    if (!isRecord(payload)) {
      return [createEvent("kimi_wire_event", { raw: payload })];
    }
    if (payload.type === "text") {
      const text = typeof payload.text === "string" ? payload.text : "";
      if (text.length > 0) {
        this.assistantChunks.push(text);
      }
      return [];
    }
    if (payload.type === "think") {
      const thinking = typeof payload.think === "string" ? payload.think : "";
      if (thinking.length > 0) {
        this.thinkingChunks.push(thinking);
      }
      return [];
    }
    return [createEvent("kimi_wire_event", { raw: payload })];
  }

  private flushMessages(): readonly KimiSessionEvent[] {
    const events: KimiSessionEvent[] = [];
    const thinking = this.thinkingChunks.join("");
    const assistant = this.assistantChunks.join("");
    if (thinking.trim().length > 0) {
      events.push(createMessageEvent("thinking", thinking));
    }
    if (assistant.trim().length > 0) {
      events.push(createMessageEvent("assistant", assistant));
    }
    this.reset();
    return events;
  }

  private reset(): void {
    this.assistantChunks.length = 0;
    this.thinkingChunks.length = 0;
  }
}
