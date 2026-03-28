import crypto from "node:crypto";
import type { ActiveSession } from "../session/types";
import { CodexTokenUsageReader, type TokenUsageSnapshot } from "../token-usage";
import type { ModuleReporter } from "../types";
import { PROVIDER } from "./codex-message-processor-shared";

export class CodexTokenUsageSync {
  private readonly reporter?: ModuleReporter;
  private readonly tokenUsageCache = new Map<
    string,
    { used: number; limit: number }
  >();
  private readonly tokenUsageReader = new CodexTokenUsageReader();

  constructor(reporter?: ModuleReporter) {
    this.reporter = reporter;
  }

  refresh(session: ActiveSession): void {
    const providerSessionId = session.codexThreadId;
    if (!providerSessionId) {
      return;
    }

    this.tokenUsageReader
      .read({ providerSessionId })
      .then((snapshot: TokenUsageSnapshot | null) => {
        if (!snapshot) {
          return;
        }

        const previous = this.tokenUsageCache.get(session.sessionId);
        if (
          previous &&
          previous.used === snapshot.used &&
          previous.limit === snapshot.limit
        ) {
          return;
        }

        this.tokenUsageCache.set(session.sessionId, {
          used: snapshot.used,
          limit: snapshot.limit,
        });
        session.eventEmitter.emit("message", {
          type: "stream_event",
          provider: PROVIDER,
          sessionId: session.sessionId,
          threadId: session.codexThreadId,
          tokenUsage: {
            used: snapshot.used,
            limit: snapshot.limit,
          },
          data: {
            kind: "token_usage",
            used: snapshot.used,
            limit: snapshot.limit,
          },
          uuid: `${crypto.randomUUID()}::token_usage`,
          timestamp: new Date().toISOString(),
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.reporter?.warn?.(
          `Codex token usage read failed (session ${providerSessionId}): ${message}`
        );
      });
  }
}
