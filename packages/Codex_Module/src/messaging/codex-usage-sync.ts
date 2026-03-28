import { CodexUsageLimitsReader } from "../sdk/codex-usage-limits-reader";
import type { ActiveSession } from "../session/types";
import type {
  CodexUsageLimits,
  CodexUsageLimitsFacadeBridge,
  ModuleReporter,
} from "../types";
import { raceWithTimeout } from "./codex-async-helpers";
import {
  CODEAI_CODEX_RATE_LIMITS_PAYLOAD_ENV_KEY,
  isRecord,
  USAGE_LIMITS_READ_TIMEOUT_MS,
} from "./codex-message-processor-shared";
import {
  emitUsageLimitsStreamEvent,
  emitUsageLimitsStreamPayload,
} from "./codex-usage-stream-event-emitter";
import {
  areUsageLimitsEqual,
  areUsageLimitsPayloadEqual,
  buildRuntimeUsageLimitsPayload,
  readUsageLimitsDiagnostics,
} from "./codex-usage-sync-shared";

export class CodexUsageSync {
  private readonly latestRuntimeUsageLimitsPayload = new Map<string, string>();
  private readonly reporter?: ModuleReporter;
  private readonly usageLimitsFacade?: CodexUsageLimitsFacadeBridge;
  private readonly usageLimitsCache = new Map<
    string,
    NonNullable<CodexUsageLimits>
  >();
  private readonly usageLimitsReader = new CodexUsageLimitsReader();

  constructor(
    reporter?: ModuleReporter,
    usageLimitsFacade?: CodexUsageLimitsFacadeBridge
  ) {
    this.reporter = reporter;
    this.usageLimitsFacade = usageLimitsFacade;
  }

  async safeRefresh(session: ActiveSession): Promise<CodexUsageLimits> {
    const providerSessionId = session.codexThreadId;
    if (!providerSessionId) {
      return null;
    }

    const startedAt = Date.now();
    session.logger?.logSDKEvent("processor.usage_limits.read.begin", {
      sessionId: session.sessionId,
      threadId: providerSessionId,
      timeoutMs: USAGE_LIMITS_READ_TIMEOUT_MS,
      force: true,
      timestampIso: new Date().toISOString(),
    });

    const { timedOut, result } = await raceWithTimeout({
      promise: this.refresh(session, { force: true }),
      timeoutMs: USAGE_LIMITS_READ_TIMEOUT_MS,
    });
    if (timedOut) {
      session.logger?.logSDKEvent("processor.usage_limits.read.timeout", {
        sessionId: session.sessionId,
        threadId: providerSessionId,
        elapsedMs: Date.now() - startedAt,
        timestampIso: new Date().toISOString(),
      });
      return this.getCachedUsageLimits(providerSessionId);
    }

    session.logger?.logSDKEvent("processor.usage_limits.read.done", {
      sessionId: session.sessionId,
      threadId: providerSessionId,
      elapsedMs: Date.now() - startedAt,
      hasSnapshot: Boolean(result),
      timestampIso: new Date().toISOString(),
    });
    return result ?? null;
  }

  async refresh(
    session: ActiveSession,
    options: { readonly force?: boolean } = {}
  ): Promise<CodexUsageLimits> {
    if (this.usageLimitsFacade) {
      return await this.refreshFromFacade(session, options);
    }
    return await this.refreshFromReader(session, options);
  }

  async handleRuntimeEvent(
    session: ActiveSession,
    event: unknown
  ): Promise<boolean> {
    const runtimePayload = buildRuntimeUsageLimitsPayload(event);
    if (!runtimePayload) {
      return false;
    }

    const root = isRecord(event) ? event : null;
    let providerSessionId = session.codexThreadId;
    if (!providerSessionId && typeof root?.thread_id === "string") {
      providerSessionId = root.thread_id;
    }
    if (!providerSessionId && typeof root?.threadId === "string") {
      providerSessionId = root.threadId;
    }
    if (!providerSessionId) {
      return true;
    }

    this.latestRuntimeUsageLimitsPayload.set(providerSessionId, runtimePayload);
    if (!this.usageLimitsFacade) {
      return true;
    }

    const previousPayload = this.usageLimitsFacade.getCachedStreamPayload({
      providerSessionId,
    });
    const nextPayload = await this.usageLimitsFacade
      .readStreamPayload({
        workspacePath: session.workspacePath,
        runtimeSessionId: session.sessionId,
        providerSessionId,
        environment: this.buildUsageLimitsEnvironment(providerSessionId),
        force: true,
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.reporter?.warn?.(
          `Codex runtime usage limits read failed (session ${providerSessionId}): ${message}`
        );
        return null;
      });

    if (
      !nextPayload?.usageLimits ||
      areUsageLimitsPayloadEqual(previousPayload, nextPayload)
    ) {
      session.logger?.logSDKEvent("processor.usage_limits.runtime.result", {
        sessionId: session.sessionId,
        threadId: providerSessionId,
        emitted: false,
        source:
          nextPayload?.data.source ?? previousPayload?.data.source ?? null,
        providerScopeKey:
          nextPayload?.providerScopeKey ??
          previousPayload?.providerScopeKey ??
          null,
        diagnostics:
          readUsageLimitsDiagnostics(nextPayload) ??
          readUsageLimitsDiagnostics(previousPayload),
        timestampIso: new Date().toISOString(),
      });
      return true;
    }

    emitUsageLimitsStreamPayload(session, providerSessionId, nextPayload);
    session.logger?.logSDKEvent("processor.usage_limits.runtime.result", {
      sessionId: session.sessionId,
      threadId: providerSessionId,
      emitted: true,
      source: nextPayload.data.source,
      providerScopeKey: nextPayload.providerScopeKey,
      diagnostics: readUsageLimitsDiagnostics(nextPayload),
      timestampIso: new Date().toISOString(),
    });
    return true;
  }

  private async refreshFromFacade(
    session: ActiveSession,
    options: { readonly force?: boolean }
  ): Promise<CodexUsageLimits> {
    const providerSessionId = session.codexThreadId;
    if (!(this.usageLimitsFacade && providerSessionId)) {
      return null;
    }

    const previousPayload = this.usageLimitsFacade.getCachedStreamPayload({
      providerSessionId,
    });
    const nextPayload = await this.usageLimitsFacade
      .readStreamPayload({
        workspacePath: session.workspacePath,
        runtimeSessionId: session.sessionId,
        providerSessionId,
        environment: this.buildUsageLimitsEnvironment(providerSessionId),
        force: options.force,
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.reporter?.warn?.(
          `Codex shared usage limits read failed (session ${providerSessionId}): ${message}`
        );
        return null;
      });

    if (!nextPayload?.usageLimits) {
      session.logger?.logSDKEvent("processor.usage_limits.facade.result", {
        sessionId: session.sessionId,
        threadId: providerSessionId,
        emitted: false,
        usedPreviousPayload: Boolean(previousPayload?.usageLimits),
        source: previousPayload?.data.source ?? null,
        diagnostics: readUsageLimitsDiagnostics(previousPayload),
        timestampIso: new Date().toISOString(),
      });
      return previousPayload?.usageLimits ?? null;
    }

    const emitted = !areUsageLimitsPayloadEqual(previousPayload, nextPayload);
    if (emitted) {
      emitUsageLimitsStreamPayload(session, providerSessionId, nextPayload);
    }

    session.logger?.logSDKEvent("processor.usage_limits.facade.result", {
      sessionId: session.sessionId,
      threadId: providerSessionId,
      emitted,
      source: nextPayload.data.source,
      providerScopeKey: nextPayload.providerScopeKey,
      hasUsageLimits: Boolean(nextPayload.usageLimits),
      diagnostics: readUsageLimitsDiagnostics(nextPayload),
      timestampIso: new Date().toISOString(),
    });
    return nextPayload.usageLimits;
  }

  private async refreshFromReader(
    session: ActiveSession,
    options: { readonly force?: boolean }
  ): Promise<CodexUsageLimits> {
    const providerSessionId = session.codexThreadId;
    if (!providerSessionId) {
      return null;
    }

    const snapshot = await this.usageLimitsReader
      .read({ providerSessionId, force: options.force })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.reporter?.warn?.(
          `Codex usage limits read failed (session ${providerSessionId}): ${message}`
        );
        return null;
      });
    if (!snapshot) {
      return this.usageLimitsCache.get(providerSessionId) ?? null;
    }

    const previousSnapshot = this.usageLimitsCache.get(providerSessionId);
    if (previousSnapshot && areUsageLimitsEqual(previousSnapshot, snapshot)) {
      return previousSnapshot;
    }

    this.usageLimitsCache.set(providerSessionId, snapshot);
    emitUsageLimitsStreamEvent(session, providerSessionId, snapshot);
    return snapshot;
  }

  private getCachedUsageLimits(providerSessionId: string): CodexUsageLimits {
    return this.usageLimitsFacade
      ? (this.usageLimitsFacade.getCachedStreamPayload({ providerSessionId })
          ?.usageLimits ?? null)
      : (this.usageLimitsCache.get(providerSessionId) ?? null);
  }

  private buildUsageLimitsEnvironment(
    providerSessionId: string
  ): NodeJS.ProcessEnv | undefined {
    const runtimePayload =
      this.latestRuntimeUsageLimitsPayload.get(providerSessionId);
    return runtimePayload
      ? { [CODEAI_CODEX_RATE_LIMITS_PAYLOAD_ENV_KEY]: runtimePayload }
      : undefined;
  }
}
