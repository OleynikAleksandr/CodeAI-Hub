import type { EventEmitter } from "node:events";

export type GeminiSessionLogger = {
  readonly start: (sessionId: string) => void;
  readonly logEvent: (event: Record<string, unknown>) => void;
  readonly end: () => void;
};

export type ActiveSession = {
  sessionId: string;
  readonly createdAt: number;
  readonly eventEmitter: EventEmitter;
  logger?: GeminiSessionLogger;
};

export type SessionCreationResult = {
  readonly sessionId: string;
  readonly session: ActiveSession;
};
