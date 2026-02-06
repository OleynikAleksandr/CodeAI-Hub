import type { EventEmitter } from "node:events";

export type MessageController = {
  pendingMessages: unknown[];
  resolveNext: ((value: unknown) => void) | null;
};

export type SessionLogger = {
  readonly start: (sessionId: string) => void;
  readonly end: () => void;
  readonly logUserInput: (content: string) => void;
  readonly logSDKMessage: (type: string, payload: unknown) => void;
  readonly renameSession?: (oldId: string, newId: string) => void;
};

export type ClaudeTurnLifecycleState = {
  started: boolean;
  ended: boolean;
};

export type ClaudeQueuedTurn = {
  readonly content: string;
  readonly turnOptions?: Record<string, unknown>;
  readonly internal: boolean;
  readonly enqueuedAt: number;
};

export type ClaudeTurnQueueState = {
  readonly pending: ClaudeQueuedTurn[];
  inFlight: ClaudeQueuedTurn | null;
  internalTurn: boolean;
  lifecycle: ClaudeTurnLifecycleState;
  processing: boolean;
};

export type ActiveSession = {
  sessionId: string;
  readonly workspacePath: string;
  readonly createdAt: number;
  readonly eventEmitter: EventEmitter;
  readonly messageController: MessageController;
  readonly logger: SessionLogger | null;
  readonly resumeSessionId?: string;
  structuredOutputSchema?: Record<string, unknown> | null;
  structuredOutputUuids?: Set<string>;
  turnQueue?: ClaudeTurnQueueState;
  processingLoop?: Promise<void>;
  messageGenerator?: AsyncGenerator<unknown>;
  queryInstance?: AsyncIterableIterator<unknown> & {
    interrupt?: () => Promise<void>;
  };
};

export type SessionCreationResult = {
  readonly tempId: string;
  readonly session: ActiveSession;
};
