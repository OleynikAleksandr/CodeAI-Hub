import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";

const MANAGED_CONTINUATION_BOUNDARY_QUIET_MS = 300;
const MANAGED_CONTINUATION_BOUNDARY_MAX_CHECKS = 8;

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export class SessionRequestHandlerManagedContinuationBoundary {
  private readonly logger: Logger;
  private readonly sessionManager: SessionManager;

  constructor(options: {
    readonly logger: Logger;
    readonly sessionManager: SessionManager;
  }) {
    this.logger = options.logger;
    this.sessionManager = options.sessionManager;
  }

  async waitForSettled(sessionId: string): Promise<boolean> {
    let lastMessageId = this.resolveLatestSessionMessageId(sessionId);
    if (lastMessageId === undefined) {
      return false;
    }
    for (
      let check = 0;
      check < MANAGED_CONTINUATION_BOUNDARY_MAX_CHECKS;
      check += 1
    ) {
      await delay(MANAGED_CONTINUATION_BOUNDARY_QUIET_MS);
      const currentMessageId = this.resolveLatestSessionMessageId(sessionId);
      if (currentMessageId === undefined) {
        return false;
      }
      if (currentMessageId === lastMessageId) {
        return true;
      }
      lastMessageId = currentMessageId;
    }
    this.logger.warn("Managed continuation turn boundary did not settle", {
      sessionId,
      lastMessageId,
    });
    return false;
  }

  private resolveLatestSessionMessageId(
    sessionId: string
  ): string | null | undefined {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return undefined;
    }
    return session.messages.at(-1)?.id ?? null;
  }
}
