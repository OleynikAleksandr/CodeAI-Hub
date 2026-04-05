import { createHash } from "node:crypto";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const readNonEmptyString = (value: unknown): string | null => {
  const text = readString(value)?.trim();
  return text ? text : null;
};

const readPhase = (value: unknown): CodexRolloutAgentMessagePhase | null =>
  value === "commentary" || value === "final_answer" ? value : null;

export type CodexRolloutAgentMessagePhase = "commentary" | "final_answer";
export type CodexRolloutPayloadType =
  | "agent_message"
  | "agent_reasoning"
  | "task_complete";
export type CodexRolloutSegmentKind =
  | "commentary"
  | "final_answer"
  | "task_complete"
  | "thinking";

export interface CodexRolloutParsedEvent {
  readonly content: string;
  readonly kind: CodexRolloutSegmentKind;
  readonly payloadType: CodexRolloutPayloadType;
  readonly phase: CodexRolloutAgentMessagePhase | null;
  readonly timestamp: string | null;
  readonly turnId: string | null;
}

const SEGMENT_ID_SEPARATOR = "\u001F";

export const createCodexRolloutSegmentId = (
  event: CodexRolloutParsedEvent
): string =>
  createHash("sha256")
    .update(
      [
        event.kind,
        event.payloadType,
        event.phase ?? "",
        event.timestamp ?? "",
        event.turnId ?? "",
        event.content,
      ].join(SEGMENT_ID_SEPARATOR)
    )
    .digest("hex");

const readBaseFields = (
  entry: Record<string, unknown>,
  payload: Record<string, unknown>
): Pick<CodexRolloutParsedEvent, "timestamp" | "turnId"> => ({
  timestamp: readString(entry.timestamp),
  turnId: readString(payload.turn_id),
});

export const parseCodexRolloutEvent = (
  entry: unknown
): CodexRolloutParsedEvent | null => {
  if (!isRecord(entry) || entry.type !== "event_msg") {
    return null;
  }

  const payload = isRecord(entry.payload) ? entry.payload : null;
  if (!payload) {
    return null;
  }

  const base = readBaseFields(entry, payload);

  if (payload.type === "agent_reasoning") {
    const content = readNonEmptyString(payload.text);
    if (!content) {
      return null;
    }
    return {
      ...base,
      content,
      kind: "thinking",
      payloadType: "agent_reasoning",
      phase: null,
    };
  }

  if (payload.type === "agent_message") {
    const phase = readPhase(payload.phase);
    const content = readNonEmptyString(payload.message);
    if (!(phase && content)) {
      return null;
    }
    return {
      ...base,
      content,
      kind: phase,
      payloadType: "agent_message",
      phase,
    };
  }

  if (payload.type === "task_complete") {
    const content = readNonEmptyString(payload.last_agent_message);
    if (!content) {
      return null;
    }
    return {
      ...base,
      content,
      kind: "task_complete",
      payloadType: "task_complete",
      phase: null,
    };
  }

  return null;
};

export const parseCodexRolloutEvents = (
  entries: readonly unknown[]
): CodexRolloutParsedEvent[] =>
  entries.flatMap((entry) => {
    const parsed = parseCodexRolloutEvent(entry);
    return parsed ? [parsed] : [];
  });
