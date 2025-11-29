import { EventEmitter } from "node:events";
import type { ActiveSession, MessageController } from "./types";

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
    } else {
      session.messageController.pendingMessages.push(null);
    }
    session.eventEmitter.removeAllListeners();
    await session.queryInstance?.interrupt?.();
  }
}
