import type { EventEmitter } from "node:events";
import type { Thread } from "@openai/codex-sdk";
import type { CodexResponsePolicy } from "../response-policy/response-policy-types";

export interface MessageController {
  pendingMessages: unknown[];
  resolveNext: ((value: unknown) => void) | null;
}

export interface SessionLogger {
  readonly end: () => void;
  readonly logSDKEvent: (scope: string, payload: unknown) => void;
  readonly logUserInput: (content: string) => void;
  readonly renameSession?: (oldId: string, newId: string) => void;
  readonly start: (sessionId: string) => void;
}

export interface ActiveSession {
  codexThreadId: string | null;
  readonly createdAt: number;
  readonly eventEmitter: EventEmitter;
  internalTurn?: boolean;
  readonly logger: SessionLogger | null;
  readonly messageController: MessageController;
  messageGenerator?: AsyncGenerator<unknown>;
  processingLoop?: Promise<void>;
  responsePolicy?: CodexResponsePolicy;
  sessionId: string;
  structuredOutputUuids?: Set<string>;
  thinkingDisplaySyncEnabled?: boolean;
  thread?: Thread;
  readonly workspacePath: string;
}

export interface SessionCreationResult {
  readonly session: ActiveSession;
  readonly tempId: string;
}
