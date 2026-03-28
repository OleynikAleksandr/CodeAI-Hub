import crypto from "node:crypto";
import type { ActiveSession } from "../session/types";
import type { CodexUsageLimits, CodexUsageLimitsStreamPayload } from "../types";
import { PROVIDER } from "./codex-message-processor-shared";

export const emitUsageLimitsStreamEvent = (
  session: ActiveSession,
  providerSessionId: string,
  usageLimits: NonNullable<CodexUsageLimits>
): void => {
  session.eventEmitter.emit("message", {
    type: "stream_event",
    provider: PROVIDER,
    sessionId: session.sessionId,
    threadId: providerSessionId,
    usageLimits,
    data: { kind: "usage_limits", usageLimits },
    uuid: `${crypto.randomUUID()}::usage_limits`,
    timestamp: new Date().toISOString(),
  });
};

export const emitUsageLimitsStreamPayload = (
  session: ActiveSession,
  providerSessionId: string,
  payload: CodexUsageLimitsStreamPayload
): void => {
  session.eventEmitter.emit("message", {
    type: "stream_event",
    provider: PROVIDER,
    sessionId: session.sessionId,
    threadId: providerSessionId,
    usageLimits: payload.usageLimits,
    data: payload.data,
    uuid: `${crypto.randomUUID()}::usage_limits`,
    timestamp: new Date().toISOString(),
  });
};
