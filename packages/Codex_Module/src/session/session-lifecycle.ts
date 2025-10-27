import { EventEmitter } from "node:events";
import type { MessageController } from "./types";

export class CodexSessionLifecycle {
  generateTemporaryId(): string {
    return `codex_${Date.now()}`;
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
            resolve(controller.pendingMessages.shift() ?? null);
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

  closeSession(controller: MessageController): void {
    if (controller.resolveNext) {
      controller.resolveNext(null);
      controller.resolveNext = null;
    } else {
      controller.pendingMessages.push(null);
    }
  }
}
