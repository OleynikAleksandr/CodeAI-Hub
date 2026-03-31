import type {
  ItemCompletedEvent,
  ItemStartedEvent,
  ItemUpdatedEvent,
  ThreadItem,
} from "@openai/codex-sdk";
import type {
  CodexTurnOptions,
  CodexUsageLimitsFacadeBridge,
  ModuleReporter,
} from "../types";
import type { CodexStartupLockRelease } from "./codex-startup-lock";
import type { StructuredOutputStreamController } from "./structured-output-stream-controller";

export const PROVIDER = "codex";
export const THREAD_ID_SHORT_LENGTH = 8;
export const STARTUP_LOCK_ACQUIRE_TIMEOUT_MS = 30_000;
export const STARTUP_LOCK_THREAD_STARTED_TIMEOUT_MS = 30_000;
export const TURN_IDLE_TIMEOUT_MS = 180_000;
export const USAGE_LIMITS_READ_TIMEOUT_MS = 5000;
export const EVENTS_RETURN_TIMEOUT_MS = 1500;
export const CODEAI_CODEX_RATE_LIMITS_PAYLOAD_ENV_KEY =
  "CODEAI_CODEX_RATE_LIMITS_PAYLOAD";

export interface EnqueuedMessage {
  readonly content: string;
  readonly internal?: boolean;
  readonly turnOptions?: CodexTurnOptions;
  readonly type: "user_input";
}

export interface MessageProcessorOptions {
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: CodexUsageLimitsFacadeBridge;
}

export interface IdlePulsePayload {
  readonly elapsedMs: number;
  readonly idleCount: number;
}

export interface StartupLockContext {
  readonly ownerSessionId: string;
  readonly release: CodexStartupLockRelease;
  readonly threadStartedTimeoutMs: number;
}

export interface TurnLifecycleState {
  ended: boolean;
  started: boolean;
}

export type ThreadItemEvent =
  | ItemStartedEvent
  | ItemUpdatedEvent
  | ItemCompletedEvent;

export type AgentMessageItem = ThreadItem & { readonly type: "agent_message" };

export const isAgentMessageItem = (
  item: ThreadItem
): item is AgentMessageItem => item.type === "agent_message";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveThreadItemPhase = (item: ThreadItem): string | null => {
  const candidate = item as unknown as { readonly phase?: unknown };
  return typeof candidate.phase === "string" ? candidate.phase : null;
};

export const shouldSuppressAgentMessageItem = (
  controller: StructuredOutputStreamController,
  sessionId: string,
  item: ThreadItem
): boolean =>
  resolveThreadItemPhase(item) === "commentary" &&
  controller.shouldSuppressCommentary(sessionId);
