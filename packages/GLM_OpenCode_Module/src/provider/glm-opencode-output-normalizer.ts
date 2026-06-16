import { randomUUID } from "node:crypto";

export interface GlmOpenCodeSessionEvent {
  readonly content?: string;
  readonly data?: Record<string, unknown>;
  readonly message?: string;
  readonly provider?: string;
  readonly timestamp?: string;
  readonly type: string;
  readonly uuid?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readJsonTextEvent = (payload: Record<string, unknown>): string | null => {
  if (payload.type !== "text") {
    return null;
  }
  const part = payload.part;
  if (isRecord(part)) {
    return readText(part.text);
  }
  return readText(payload.text);
};

const readJsonErrorEvent = (
  payload: Record<string, unknown>
): string | null => {
  if (payload.type !== "error") {
    return null;
  }
  const error = payload.error;
  if (typeof error === "string") {
    return readText(error);
  }
  if (isRecord(error)) {
    return readText(error.message) ?? readText(error.name);
  }
  return readText(payload.message);
};

export const normalizeOpenCodeJsonLine = (
  line: string
): GlmOpenCodeSessionEvent[] => {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return [];
  }
  let payload: unknown;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!isRecord(payload)) {
    return [];
  }
  const timestamp = new Date().toISOString();
  const text = readJsonTextEvent(payload);
  if (text) {
    return [
      {
        content: text,
        provider: "glmOpenCode",
        timestamp,
        type: "assistant",
        uuid: `${randomUUID()}::assistant`,
      },
    ];
  }
  const error = readJsonErrorEvent(payload);
  if (error) {
    return [
      {
        message: error,
        provider: "glmOpenCode",
        timestamp,
        type: "turn_failed",
        uuid: `${randomUUID()}::turn_failed`,
      },
    ];
  }
  return [];
};
