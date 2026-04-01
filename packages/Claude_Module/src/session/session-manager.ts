import { SDKSessionLoggerFacade } from "../logging/sdk-session-logger";
import { SDKSessionLifecycle } from "./session-lifecycle";
import { SDKSessionRegistry } from "./session-registry";
import type {
  ActiveSession,
  ClaudeQueuedTurn,
  ClaudeTurnQueueState,
  SessionCreationResult,
  SessionLogger,
} from "./types";

export class SDKSessionManager {
  private readonly registry: SDKSessionRegistry;
  private readonly lifecycle: SDKSessionLifecycle;

  constructor(options?: {
    readonly registry?: SDKSessionRegistry;
    readonly lifecycle?: SDKSessionLifecycle;
  }) {
    this.registry = options?.registry ?? new SDKSessionRegistry();
    this.lifecycle = options?.lifecycle ?? new SDKSessionLifecycle();
  }

  createSession(
    workspacePath: string,
    logger: SessionLogger | null = null
  ): SessionCreationResult {
    const controller = this.lifecycle.createMessageController();
    const eventEmitter = this.lifecycle.createEventEmitter();
    const tempId = this.lifecycle.generateTemporaryId();
    const session: ActiveSession = {
      sessionId: tempId,
      workspacePath,
      createdAt: Date.now(),
      eventEmitter,
      messageController: controller,
      logger: logger ?? new SDKSessionLoggerFacade(),
      runtimeTurnConfig: {
        thinkingDisplaySyncEnabled: true,
      },
      turnQueue: this.lifecycle.createTurnQueueState(),
    };
    session.messageGenerator =
      this.lifecycle.createMessageGenerator(controller);
    this.registry.add(session);
    session.logger?.start(tempId);
    return { tempId, session };
  }

  createResumedSession(
    workspacePath: string,
    sessionId: string,
    logger: SessionLogger | null = null
  ): ActiveSession {
    const controller = this.lifecycle.createMessageController();
    const eventEmitter = this.lifecycle.createEventEmitter();
    const session: ActiveSession = {
      sessionId,
      workspacePath,
      createdAt: Date.now(),
      eventEmitter,
      messageController: controller,
      logger: logger ?? new SDKSessionLoggerFacade(),
      resumeSessionId: sessionId,
      runtimeTurnConfig: {
        thinkingDisplaySyncEnabled: true,
      },
      turnQueue: this.lifecycle.createTurnQueueState(),
    };
    session.messageGenerator =
      this.lifecycle.createMessageGenerator(controller);
    this.registry.add(session);
    session.logger?.start(sessionId);
    return session;
  }

  updateSessionId(tempId: string, realId: string): void {
    this.registry.updateSessionId(tempId, realId);
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.registry.get(sessionId);
  }

  getTurnQueue(sessionId: string): ClaudeTurnQueueState | null {
    return this.registry.get(sessionId)?.turnQueue ?? null;
  }

  enqueueTurn(sessionId: string, turn: ClaudeQueuedTurn): void {
    const session = this.registry.get(sessionId);
    if (!session?.turnQueue) {
      return;
    }
    this.lifecycle.enqueueTurn(session.turnQueue, turn);
  }

  takeNextTurn(sessionId: string): ClaudeQueuedTurn | null {
    const session = this.registry.get(sessionId);
    if (!session?.turnQueue) {
      return null;
    }
    return this.lifecycle.takeNextTurn(session.turnQueue);
  }

  beginTurn(sessionId: string, options: { readonly internal: boolean }): void {
    const session = this.registry.get(sessionId);
    if (!session?.turnQueue) {
      return;
    }
    this.lifecycle.beginTurn(session.turnQueue, options);
  }

  markTurnStarted(sessionId: string): void {
    const session = this.registry.get(sessionId);
    if (!session?.turnQueue) {
      return;
    }
    this.lifecycle.markTurnStarted(session.turnQueue);
  }

  markTurnEnded(sessionId: string): void {
    const session = this.registry.get(sessionId);
    if (!session?.turnQueue) {
      return;
    }
    this.lifecycle.markTurnEnded(session.turnQueue);
  }

  clearInFlightTurn(sessionId: string): void {
    const session = this.registry.get(sessionId);
    if (!session?.turnQueue) {
      return;
    }
    this.lifecycle.clearInFlightTurn(session.turnQueue);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.registry.get(sessionId);
    if (!session) {
      return;
    }
    await this.lifecycle.closeSession(session);
    session.logger?.end();
    this.registry.delete(sessionId);
  }

  listSessions(): readonly ActiveSession[] {
    return this.registry.listSessions();
  }
}
