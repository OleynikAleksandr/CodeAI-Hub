import { killActiveCodexProcess } from "../sdk/codex-sdk-patches";
import { CodexSessionLifecycle } from "./session-lifecycle";
import { CodexSessionRegistry } from "./session-registry";
import type {
  ActiveSession,
  SessionCreationResult,
  SessionLogger,
} from "./types";

export class CodexSessionManager {
  private readonly registry: CodexSessionRegistry;
  private readonly lifecycle: CodexSessionLifecycle;

  constructor(options?: {
    readonly registry?: CodexSessionRegistry;
    readonly lifecycle?: CodexSessionLifecycle;
  }) {
    this.registry = options?.registry ?? new CodexSessionRegistry();
    this.lifecycle = options?.lifecycle ?? new CodexSessionLifecycle();
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
      logger,
      codexThreadId: null,
      internalTurn: false,
    };
    session.messageGenerator =
      this.lifecycle.createMessageGenerator(controller);
    this.registry.add(session);
    session.logger?.start(tempId);
    return { tempId, session };
  }

  createResumedSession(
    workspacePath: string,
    threadId: string,
    logger: SessionLogger | null = null
  ): ActiveSession {
    const controller = this.lifecycle.createMessageController();
    const eventEmitter = this.lifecycle.createEventEmitter();
    const session: ActiveSession = {
      sessionId: threadId,
      workspacePath,
      createdAt: Date.now(),
      eventEmitter,
      messageController: controller,
      logger,
      codexThreadId: threadId,
      internalTurn: false,
    };
    session.messageGenerator =
      this.lifecycle.createMessageGenerator(controller);
    this.registry.add(session);
    session.logger?.start(threadId);
    return session;
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.registry.get(sessionId);
  }

  listSessions(): readonly ActiveSession[] {
    return this.registry.listSessions();
  }

  updateSessionId(tempId: string, realId: string): void {
    this.registry.updateSessionId(tempId, realId);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.registry.get(sessionId);
    if (!session) {
      return;
    }
    killActiveCodexProcess(session.codexThreadId);
    await this.lifecycle.closeSession(session.messageController);
    if (session.processingLoop) {
      try {
        await session.processingLoop;
      } catch {
        // Swallow processing loop errors; they are surfaced via event emitters.
      }
    }
    session.eventEmitter.removeAllListeners();
    session.logger?.end();
    this.registry.delete(sessionId);
  }
}
