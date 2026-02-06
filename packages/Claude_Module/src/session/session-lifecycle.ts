import { EventEmitter } from "node:events";
import type {
  ActiveSession,
  ClaudeQueuedTurn,
  ClaudeTurnQueueState,
  MessageController,
} from "./types";

export class SDKSessionLifecycle {
  generateTemporaryId(): string {
    return `temp_${Date.now()}`;
  }

  createEventEmitter(): EventEmitter {
    return new EventEmitter();
  }

  createMessageController(): MessageController {
    return {
      pendingMessages: [],
      resolveNext: null,
    };
  }

  createTurnQueueState(): ClaudeTurnQueueState {
    return {
      pending: [],
      inFlight: null,
      internalTurn: false,
      lifecycle: { started: false, ended: false },
      processing: false,
    };
  }

  enqueueTurn(queueState: ClaudeTurnQueueState, turn: ClaudeQueuedTurn): void {
    queueState.pending.push(turn);
  }

  takeNextTurn(queueState: ClaudeTurnQueueState): ClaudeQueuedTurn | null {
    const next = queueState.pending.shift() ?? null;
    queueState.inFlight = next;
    return next;
  }

  beginTurn(
    queueState: ClaudeTurnQueueState,
    options: { readonly internal: boolean }
  ): void {
    queueState.internalTurn = options.internal;
    queueState.lifecycle.started = false;
    queueState.lifecycle.ended = false;
  }

  markTurnStarted(queueState: ClaudeTurnQueueState): void {
    queueState.lifecycle.started = true;
    queueState.lifecycle.ended = false;
  }

  markTurnEnded(queueState: ClaudeTurnQueueState): void {
    queueState.lifecycle.ended = true;
  }

  clearInFlightTurn(queueState: ClaudeTurnQueueState): void {
    queueState.inFlight = null;
    queueState.internalTurn = false;
    queueState.lifecycle.started = false;
    queueState.lifecycle.ended = false;
  }

  createMessageGenerator(
    controller: MessageController
  ): AsyncGenerator<unknown> {
    const generator = async function* generate() {
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const value = await new Promise<unknown>((resolve) => {
          if (controller.pendingMessages.length > 0) {
            resolve(controller.pendingMessages.shift());
            return;
          }
          controller.resolveNext = resolve;
        });
        if (value == null) {
          break;
        }
        yield value;
      }
    };
    return generator();
  }

  async closeSession(session: ActiveSession): Promise<void> {
    if (session.messageController.resolveNext) {
      session.messageController.resolveNext(null);
      session.messageController.resolveNext = null;
    } else {
      session.messageController.pendingMessages.push(null);
    }
    if (session.turnQueue) {
      session.turnQueue.pending.length = 0;
      this.clearInFlightTurn(session.turnQueue);
      session.turnQueue.processing = false;
    }
    session.eventEmitter.removeAllListeners();
    await session.queryInstance?.interrupt?.();
  }
}
