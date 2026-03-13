import type { EventEmitter } from "node:events";
import type { Thread } from "@openai/codex-sdk";
import type { CodexResponsePolicy } from "../response-policy/response-policy-types";

export type MessageController = {
  pendingMessages: unknown[];
  resolveNext: ((value: unknown) => void) | null;
};

export type SessionLogger = {
  readonly start: (sessionId: string) => void;
  readonly end: () => void;
  readonly logUserInput: (content: string) => void;
  readonly logSDKEvent: (scope: string, payload: unknown) => void;
  readonly renameSession?: (oldId: string, newId: string) => void;
};

export type ActiveSession = {
  sessionId: string;
  readonly workspacePath: string;
  readonly createdAt: number;
  readonly eventEmitter: EventEmitter;
  readonly messageController: MessageController;
  readonly logger: SessionLogger | null;
  messageGenerator?: AsyncGenerator<unknown>;
  thread?: Thread;
  codexThreadId: string | null;
  processingLoop?: Promise<void>;
  internalTurn?: boolean;
  responsePolicy?: CodexResponsePolicy;
  structuredOutputUuids?: Set<string>;
};

export type SessionCreationResult = {
  readonly tempId: string;
  readonly session: ActiveSession;
};
