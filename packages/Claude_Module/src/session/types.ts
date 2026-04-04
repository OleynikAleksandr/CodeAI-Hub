import type { EventEmitter } from "node:events";
import type { ClaudeStreamMessage } from "../types";

export interface MessageController {
  pendingMessages: unknown[];
  resolveNext: ((value: unknown) => void) | null;
}

export interface SessionLogger {
  readonly end: () => void;
  readonly logSDKMessage: (type: string, payload: unknown) => void;
  readonly logUserInput: (content: string) => void;
  readonly renameSession?: (oldId: string, newId: string) => void;
  readonly start: (sessionId: string) => void;
}

export interface ClaudeTurnLifecycleState {
  ended: boolean;
  started: boolean;
}

export interface ClaudeRuntimeTurnConfig {
  messagesForTheUserLanguage?: string;
  thinkingDisplaySyncEnabled?: boolean;
}

export interface ClaudeQueuedTurn {
  readonly content: string;
  readonly enqueuedAt: number;
  readonly internal: boolean;
  readonly turnOptions?: Record<string, unknown>;
}

export interface ClaudeTurnQueueState {
  inFlight: ClaudeQueuedTurn | null;
  internalTurn: boolean;
  lifecycle: ClaudeTurnLifecycleState;
  readonly pending: ClaudeQueuedTurn[];
  processing: boolean;
  shutdownRequested: boolean;
}

export interface ActiveSession {
  readonly createdAt: number;
  readonly eventEmitter: EventEmitter;
  readonly logger: SessionLogger | null;
  readonly messageController: MessageController;
  messageGenerator?: AsyncGenerator<unknown>;
  processingLoop?: Promise<void>;
  queryInstance?: AsyncIterableIterator<unknown> & {
    interrupt?: () => Promise<void>;
  };
  readonly resumeSessionId?: string;
  readonly runtimeTurnConfig: ClaudeRuntimeTurnConfig;
  sessionId: string;
  structuredOutputSchema?: Record<string, unknown> | null;
  structuredOutputUuids?: Set<string>;
  turnQueue?: ClaudeTurnQueueState;
  readonly workspacePath: string;
}

export interface ClaudeTurnProcessorHooks {
  readonly createIterator: (payload: {
    readonly session: ActiveSession;
    readonly turn: ClaudeQueuedTurn;
  }) => AsyncIterableIterator<ClaudeStreamMessage> & {
    interrupt?: () => Promise<void>;
  };
  readonly onRealSessionId: (payload: {
    readonly session: ActiveSession;
    readonly previousSessionId: string;
    readonly realSessionId: string;
  }) => void;
}

export interface SessionCreationResult {
  readonly session: ActiveSession;
  readonly tempId: string;
}
