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

export type ActiveSession = {
  sessionId: string;
  readonly createdAt: number;
  readonly eventEmitter: EventEmitter;
  readonly messageController: MessageController;
  readonly logger: SessionLogger | null;
  messageGenerator?: AsyncGenerator<unknown>;
  queryInstance?: AsyncIterableIterator<unknown> & {
    interrupt?: () => Promise<void>;
  };
};

export type SessionCreationResult = {
  readonly tempId: string;
  readonly session: ActiveSession;
};
