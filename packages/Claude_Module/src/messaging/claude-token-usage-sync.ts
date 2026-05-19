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

export interface TokenUsageReadResult {
  readonly postTurnTokenUsageUnavailable: boolean;
  readonly tokenUsage: TokenUsageSnapshot | null;
}

interface ClaudeTokenUsageSyncOptions {
  readonly providerId?: string;
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
    Promise<TokenUsageReadResult>
  >();
  private readonly contextUsageLastAttemptAt = new Map<string, number>();
  private readonly providerId: string;
  private readonly reporter?: ModuleReporter;
  private readonly tokenUsageCache = new Map<
    string,
    { used: number; limit: number }
  >();

  constructor(options: ClaudeTokenUsageSyncOptions) {
    this.providerId = options.providerId ?? "claude";
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
  ): Promise<TokenUsageReadResult> {
    const reader = this.contextUsageReader;
    if (!reader) {
      return {
        tokenUsage: null,
        postTurnTokenUsageUnavailable: true,
      };
    }

    const resolvedId = resolveClaudeProviderSessionId(session, claudeSessionId);
    if (!resolvedId) {
      return {
        tokenUsage: null,
        postTurnTokenUsageUnavailable: true,
      };
    }

    const now = Date.now();
    const lastAttempt = this.contextUsageLastAttemptAt.get(resolvedId);
    if (
      !options.force &&
      lastAttempt &&
      now - lastAttempt < MIN_REFRESH_INTERVAL_MS
    ) {
      return {
        tokenUsage: null,
        postTurnTokenUsageUnavailable: false,
      };
    }
    this.contextUsageLastAttemptAt.set(resolvedId, now);

    const inFlight = this.contextUsageInFlight.get(resolvedId);
    if (inFlight) {
      if (options.force) {
        return await inFlight;
      }
      return {
        tokenUsage: this.tokenUsageCache.get(resolvedId) ?? null,
        postTurnTokenUsageUnavailable: false,
      };
    }

    const refreshPromise = reader
      .read({ sessionId: resolvedId, cwd: session.workspacePath })
      .then((snapshot) => {
        if (!snapshot) {
          return {
            tokenUsage: null,
            postTurnTokenUsageUnavailable: true,
          } satisfies TokenUsageReadResult;
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
          return {
            tokenUsage: previous,
            postTurnTokenUsageUnavailable: false,
          } satisfies TokenUsageReadResult;
        }

        this.tokenUsageCache.set(resolvedId, nextUsage);
        session.eventEmitter.emit("message", {
          type: "stream_event",
          provider: this.providerId,
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
        return {
          tokenUsage: nextUsage,
          postTurnTokenUsageUnavailable: false,
        } satisfies TokenUsageReadResult;
      })
      .catch((error) => {
        this.reporter?.warn?.(
          `Claude /context token read failed (session ${resolvedId}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return {
          tokenUsage: this.tokenUsageCache.get(resolvedId) ?? null,
          postTurnTokenUsageUnavailable: !this.tokenUsageCache.has(resolvedId),
        } satisfies TokenUsageReadResult;
      })
      .finally(() => {
        this.contextUsageInFlight.delete(resolvedId);
      });

    this.contextUsageInFlight.set(resolvedId, refreshPromise);
    return await refreshPromise;
  }
}

export { resolveClaudeProviderSessionId };
