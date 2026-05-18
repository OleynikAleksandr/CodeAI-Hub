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
      return [createEvent("step_started")];
    case "StatusUpdate":
      return [createEvent("status_update", { raw: envelope.payload })];
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
    return [createEvent("assistant_delta", { text: "" })];
  }
  const text = typeof payload.text === "string" ? payload.text : "";
  if (text.length === 0) {
    return [];
  }
  return [
    createEvent("assistant_delta", {
      text,
    }),
  ];
};
