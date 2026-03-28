import crypto from "node:crypto";
import type { ActiveSession } from "../session/types";
import type {
  ClaudeStreamMessage,
  ClaudeUsageLimitBucket,
  ClaudeUsageLimits,
  ClaudeUsageLimitsFacadeBridge,
  ClaudeUsageLimitsStreamPayload,
  ModuleReporter,
} from "../types";
import type {
  ContextUsageReaderConfig as ClaudeContextUsageReaderConfig,
  TokenUsageSnapshot as ClaudeTokenUsageSnapshot,
} from "./claude-token-usage-sync";
import {
  ClaudeTokenUsageSync,
  resolveClaudeProviderSessionId,
} from "./claude-token-usage-sync";

const CLAUDE_RUNTIME_RATE_LIMIT_INFO_ENV_KEY =
  "CODEAI_CLAUDE_RATE_LIMIT_INFO_PAYLOAD";

export type {
  ContextUsageReaderConfig,
  TokenUsageSnapshot,
} from "./claude-token-usage-sync";

interface ClaudeUsageSyncOptions {
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: ClaudeUsageLimitsFacadeBridge;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const areUsageLimitBucketsEqual = (
  left: ClaudeUsageLimitBucket | null | undefined,
  right: ClaudeUsageLimitBucket | null | undefined
): boolean => {
  if (!(left || right)) {
    return true;
  }
  if (!(left && right)) {
    return false;
  }
  return (
    left.percentUsed === right.percentUsed && left.resetsAt === right.resetsAt
  );
};

const areUsageLimitsPayloadEqual = (
  left: ClaudeUsageLimitsStreamPayload | null,
  right: ClaudeUsageLimitsStreamPayload | null
): boolean =>
  !(left || right) ||
  Boolean(
    left &&
      right &&
      left.providerScopeKey === right.providerScopeKey &&
      left.data.source === right.data.source &&
      left.data.collectedAt === right.data.collectedAt &&
      areUsageLimitBucketsEqual(
        left.usageLimits?.currentSession,
        right.usageLimits?.currentSession
      ) &&
      areUsageLimitBucketsEqual(
        left.usageLimits?.currentWeekAllModels,
        right.usageLimits?.currentWeekAllModels
      ) &&
      areUsageLimitBucketsEqual(
        left.usageLimits?.currentWeekSonnetOnly,
        right.usageLimits?.currentWeekSonnetOnly
      )
  );

const buildRuntimeUsageLimitsPayload = (
  message: ClaudeStreamMessage
): string | null => {
  let rateLimitInfo: Record<string, unknown> | null = null;
  if (isRecord(message.rate_limit_info)) {
    rateLimitInfo = message.rate_limit_info;
  } else if (isRecord(message.rateLimitInfo)) {
    rateLimitInfo = message.rateLimitInfo;
  }
  if (!rateLimitInfo) {
    return null;
  }
  const rateLimitType = rateLimitInfo.rateLimitType;
  if (
    rateLimitType !== "five_hour" &&
    rateLimitType !== "seven_day" &&
    rateLimitType !== "seven_day_sonnet"
  ) {
    return null;
  }
  return JSON.stringify({
    collectedAt:
      typeof message.timestamp === "string"
        ? message.timestamp
        : new Date().toISOString(),
    rateLimitInfo,
  });
};

export class ClaudeUsageSync {
  private readonly latestRuntimeUsageLimitsPayload = new Map<string, string>();
  private readonly reporter?: ModuleReporter;
  private readonly tokenUsageSync: ClaudeTokenUsageSync;
  private readonly usageLimitsFacade?: ClaudeUsageLimitsFacadeBridge;
  private usageLimitsEnvironment: NodeJS.ProcessEnv | undefined;

  constructor(options: ClaudeUsageSyncOptions) {
    this.reporter = options.reporter;
    this.tokenUsageSync = new ClaudeTokenUsageSync(options);
    this.usageLimitsFacade = options.usageLimitsFacade;
  }

  configureContextUsageReader(config: ClaudeContextUsageReaderConfig): void {
    this.usageLimitsEnvironment = config.env;
    this.tokenUsageSync.configureContextUsageReader(config);
  }

  async readCompletionPayload(
    session: ActiveSession,
    claudeSessionId: string | null | undefined
  ): Promise<{
    readonly tokenUsage?: ClaudeTokenUsageSnapshot | null;
    readonly usageLimits?: ClaudeUsageLimits;
  }> {
    const tokenUsage = await this.tokenUsageSync.readTokenUsage(
      session,
      claudeSessionId,
      { force: true }
    );
    const usageLimits = await this.refreshUsageLimitsFromUsage(
      session,
      claudeSessionId,
      { force: true }
    );
    return { tokenUsage, usageLimits };
  }

  async handleRateLimitEvent(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
    const facade = this.usageLimitsFacade;
    if (!facade) {
      return;
    }
    const resolvedId = this.resolveTokenUsageSessionId(
      session,
      message.session_id
    );
    const runtimePayload = buildRuntimeUsageLimitsPayload(message);
    if (!(resolvedId && runtimePayload)) {
      return;
    }
    this.latestRuntimeUsageLimitsPayload.set(resolvedId, runtimePayload);
    const previousPayload = facade.getCachedStreamPayload({
      providerSessionId: resolvedId,
    });
    const nextPayload = await facade
      .readStreamPayload({
        workspacePath: session.workspacePath,
        runtimeSessionId: session.sessionId,
        providerSessionId: resolvedId,
        environment: this.buildUsageLimitsEnvironment(resolvedId),
        force: true,
      })
      .catch((error) => {
        this.reporter?.warn?.(
          `Claude runtime usage limits read failed (session ${resolvedId}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return null;
      });
    if (
      !nextPayload?.usageLimits ||
      areUsageLimitsPayloadEqual(previousPayload, nextPayload)
    ) {
      return;
    }
    session.eventEmitter.emit("message", {
      type: "stream_event",
      provider: "claude",
      sessionId: session.sessionId,
      claudeSessionId: resolvedId,
      usageLimits: nextPayload.usageLimits,
      data: nextPayload.data,
      uuid: `${crypto.randomUUID()}::usage_limits`,
      timestamp: new Date().toISOString(),
    });
  }

  private async refreshUsageLimitsFromUsage(
    session: ActiveSession,
    claudeSessionId: string | null | undefined,
    options: { readonly force?: boolean } = {}
  ): Promise<ClaudeUsageLimits> {
    const facade = this.usageLimitsFacade;
    if (!facade) {
      return null;
    }
    const resolvedId = this.resolveTokenUsageSessionId(
      session,
      claudeSessionId
    );
    if (!resolvedId) {
      return null;
    }
    const previousPayload = facade.getCachedStreamPayload({
      providerSessionId: resolvedId,
    });
    const nextPayload = await facade
      .readStreamPayload({
        workspacePath: session.workspacePath,
        runtimeSessionId: session.sessionId,
        providerSessionId: resolvedId,
        environment: this.buildUsageLimitsEnvironment(resolvedId),
        force: options.force,
      })
      .catch((error) => {
        this.reporter?.warn?.(
          `Claude shared usage limits read failed (session ${resolvedId}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return null;
      });
    if (!nextPayload?.usageLimits) {
      return null;
    }
    if (!areUsageLimitsPayloadEqual(previousPayload, nextPayload)) {
      session.eventEmitter.emit("message", {
        type: "stream_event",
        provider: "claude",
        sessionId: session.sessionId,
        claudeSessionId: resolvedId,
        usageLimits: nextPayload.usageLimits,
        data: nextPayload.data,
        uuid: `${crypto.randomUUID()}::usage_limits`,
        timestamp: new Date().toISOString(),
      });
    }
    return nextPayload.usageLimits;
  }

  private resolveTokenUsageSessionId(
    session: ActiveSession,
    claudeSessionId: string | null | undefined
  ): string | null {
    return resolveClaudeProviderSessionId(session, claudeSessionId);
  }

  private buildUsageLimitsEnvironment(
    providerSessionId: string
  ): NodeJS.ProcessEnv | undefined {
    const runtimePayload =
      this.latestRuntimeUsageLimitsPayload.get(providerSessionId);
    return runtimePayload
      ? {
          ...(this.usageLimitsEnvironment ?? {}),
          [CLAUDE_RUNTIME_RATE_LIMIT_INFO_ENV_KEY]: runtimePayload,
        }
      : this.usageLimitsEnvironment;
  }
}
