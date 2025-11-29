import { SDKSessionLoggerFacade } from "../logging/sdk-session-logger";
import { SDKSessionLifecycle } from "./session-lifecycle";
import { SDKSessionRegistry } from "./session-registry";
import type {
  ActiveSession,
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

  createSession(logger: SessionLogger | null = null): SessionCreationResult {
    const controller = this.lifecycle.createMessageController();
    const eventEmitter = this.lifecycle.createEventEmitter();
    const tempId = this.lifecycle.generateTemporaryId();
    const session: ActiveSession = {
      sessionId: tempId,
      createdAt: Date.now(),
      eventEmitter,
      messageController: controller,
      logger: logger ?? new SDKSessionLoggerFacade(),
    };
    session.messageGenerator =
      this.lifecycle.createMessageGenerator(controller);
    this.registry.add(session);
    session.logger?.start(tempId);
    return { tempId, session };
  }

  updateSessionId(tempId: string, realId: string): void {
    this.registry.updateSessionId(tempId, realId);
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.registry.get(sessionId);
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
