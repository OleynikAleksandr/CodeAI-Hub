import crypto from "node:crypto";
import { ClaudeContextUsageReader } from "../sdk/claude-context-usage-reader";
import type { ActiveSession } from "../session/types";
import type { ModuleReporter } from "../types";

const MIN_REFRESH_INTERVAL_MS = 1500;
const TEMP_SESSION_PREFIX = "temp_";

export interface ContextUsageReaderConfig {
  readonly env: NodeJS.ProcessEnv;
  readonly executablePath: string;
}

export interface TokenUsageSnapshot {
  readonly limit: number;
  readonly used: number;
}

interface ClaudeTokenUsageSyncOptions {
  readonly reporter?: ModuleReporter;
}

const resolveClaudeProviderSessionId = (
  session: ActiveSession,
  claudeSessionId: string | null | undefined
): string | null => {
  const candidate = claudeSessionId ?? session.sessionId;
  return !candidate || candidate.startsWith(TEMP_SESSION_PREFIX)
    ? null
    : candidate;
};

export class ClaudeTokenUsageSync {
  private contextUsageReader: ClaudeContextUsageReader | null = null;
  private readonly contextUsageInFlight = new Map<
    string,
    Promise<TokenUsageSnapshot | null>
  >();
  private readonly contextUsageLastAttemptAt = new Map<string, number>();
  private readonly reporter?: ModuleReporter;
  private readonly tokenUsageCache = new Map<
    string,
    { used: number; limit: number }
  >();

  constructor(options: ClaudeTokenUsageSyncOptions) {
    this.reporter = options.reporter;
  }

  configureContextUsageReader(config: ContextUsageReaderConfig): void {
    if (!this.contextUsageReader) {
      this.contextUsageReader = new ClaudeContextUsageReader(config);
    }
  }

  async readTokenUsage(
    session: ActiveSession,
    claudeSessionId: string | null | undefined,
    options: { readonly force?: boolean } = {}
  ): Promise<TokenUsageSnapshot | null> {
    const reader = this.contextUsageReader;
    if (!reader) {
      return null;
    }

    const resolvedId = resolveClaudeProviderSessionId(session, claudeSessionId);
    if (!resolvedId) {
      return null;
    }

    const now = Date.now();
    const lastAttempt = this.contextUsageLastAttemptAt.get(resolvedId);
    if (
      !options.force &&
      lastAttempt &&
      now - lastAttempt < MIN_REFRESH_INTERVAL_MS
    ) {
      return null;
    }
    this.contextUsageLastAttemptAt.set(resolvedId, now);

    const inFlight = this.contextUsageInFlight.get(resolvedId);
    if (inFlight) {
      if (options.force) {
        await inFlight;
      }
      return this.tokenUsageCache.get(resolvedId) ?? null;
    }

    const refreshPromise = reader
      .read({ sessionId: resolvedId, cwd: session.workspacePath })
      .then((snapshot) => {
        if (!snapshot) {
          return null;
        }

        const nextUsage = {
          used: snapshot.used,
          limit: snapshot.limit,
        } satisfies TokenUsageSnapshot;
        const previous = this.tokenUsageCache.get(resolvedId);
        if (
          previous &&
          previous.used === nextUsage.used &&
          previous.limit === nextUsage.limit
        ) {
          return previous;
        }

        this.tokenUsageCache.set(resolvedId, nextUsage);
        session.eventEmitter.emit("message", {
          type: "stream_event",
          provider: "claude",
          sessionId: session.sessionId,
          claudeSessionId: resolvedId,
          tokenUsage: nextUsage,
          data: {
            kind: "token_usage",
            used: nextUsage.used,
            limit: nextUsage.limit,
          },
          uuid: `${crypto.randomUUID()}::token_usage`,
          timestamp: new Date().toISOString(),
        });
        return nextUsage;
      })
      .catch((error) => {
        this.reporter?.warn?.(
          `Claude /context token read failed (session ${resolvedId}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return null;
      })
      .finally(() => {
        this.contextUsageInFlight.delete(resolvedId);
      });

    this.contextUsageInFlight.set(resolvedId, refreshPromise);
    return await refreshPromise;
  }
}

export { resolveClaudeProviderSessionId };
