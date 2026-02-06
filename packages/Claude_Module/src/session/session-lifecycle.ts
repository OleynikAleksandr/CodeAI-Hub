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
      shutdownRequested: false,
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

  requestShutdown(queueState: ClaudeTurnQueueState): void {
    queueState.shutdownRequested = true;
    queueState.pending.length = 0;
    if (!queueState.inFlight) {
      this.clearInFlightTurn(queueState);
    }
  }

  isShutdownRequested(queueState: ClaudeTurnQueueState): boolean {
    return queueState.shutdownRequested;
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

  closeSession(session: ActiveSession): void {
    if (session.turnQueue) {
      this.requestShutdown(session.turnQueue);
      session.turnQueue.processing = false;
    }
    if (session.messageController.resolveNext) {
      session.messageController.resolveNext(null);
      session.messageController.resolveNext = null;
    } else {
      session.messageController.pendingMessages.length = 0;
      session.messageController.pendingMessages.push(null);
    }
    const interruptPromise = session.queryInstance?.interrupt?.();
    if (interruptPromise) {
      interruptPromise.catch(() => null);
    }
    session.queryInstance = undefined;
    session.messageGenerator = undefined;
    session.eventEmitter.removeAllListeners();
  }
}
