import crypto from "node:crypto";
import type { CodexUsageLimits, CodexUsageLimitsStreamPayload } from "../types";

export interface AppServerSessionState {
  activeTurnId: string | null;
  readonly assistantTextByItemId: Map<string, string>;
  readonly listeners: Set<(payload: unknown) => void>;
  readonly reasoningSummariesByItemId: Map<string, string[]>;
  workspacePath: string;
}

interface RateLimitBucket {
  readonly resetsAt?: unknown;
  readonly usedPercent?: unknown;
}

interface RateLimitSnapshot {
  readonly primary?: RateLimitBucket | null;
  readonly secondary?: RateLimitBucket | null;
}

interface CodexAppServerEventRouterDependencies {
  readonly emit: (threadId: string, payload: unknown) => void;
  readonly ensureSessionState: (threadId: string) => AppServerSessionState;
  readonly listThreadIds: () => Iterable<string>;
}

const DEFAULT_PROVIDER_SCOPE_KEY = "codex";
const PROVIDER = "codex";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asText = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const nowIso = (): string => new Date().toISOString();

const buildUsageLimits = (
  snapshot: RateLimitSnapshot | null
): CodexUsageLimits => {
  if (!snapshot) {
    return null;
  }
  return {
    currentSession: snapshot.primary
      ? {
          percentUsed: asNumber(snapshot.primary.usedPercent) ?? 0,
          resetsAt: asString(snapshot.primary.resetsAt),
        }
      : null,
    currentWeekAllModels: snapshot.secondary
      ? {
          percentUsed: asNumber(snapshot.secondary.usedPercent) ?? 0,
          resetsAt: asString(snapshot.secondary.resetsAt),
        }
      : null,
  };
};

const buildUsageLimitsPayload = (
  usageLimits: NonNullable<CodexUsageLimits>
): CodexUsageLimitsStreamPayload => ({
  providerScopeKey: DEFAULT_PROVIDER_SCOPE_KEY,
  usageLimits,
  data: {
    kind: "usage_limits",
    usageLimits,
    providerScopeKey: DEFAULT_PROVIDER_SCOPE_KEY,
    source: "app_server",
    collectedAt: nowIso(),
  },
});

export class CodexAppServerEventRouter {
  private lastUsageLimits: CodexUsageLimits = null;
  private readonly deps: CodexAppServerEventRouterDependencies;

  constructor(deps: CodexAppServerEventRouterDependencies) {
    this.deps = deps;
  }

  handleNotification(method: string, params: unknown): void {
    switch (method) {
      case "turn/started":
        this.handleTurnStarted(params);
        break;
      case "turn/completed":
        this.handleTurnCompleted(params);
        break;
      case "error":
        this.handleTurnError(params);
        break;
      case "item/agentMessage/delta":
        this.handleAgentMessageDelta(params);
        break;
      case "item/reasoning/summaryPartAdded":
        this.handleReasoningSummaryPartAdded(params);
        break;
      case "item/reasoning/summaryTextDelta":
        this.handleReasoningSummaryTextDelta(params);
        break;
      case "item/completed":
        this.handleItemCompleted(params);
        break;
      case "thread/tokenUsage/updated":
        this.handleThreadTokenUsageUpdated(params);
        break;
      case "account/rateLimits/updated":
        this.handleAccountRateLimitsUpdated(params);
        break;
      default:
        break;
    }
  }

  emitRuntimeModel(threadId: string, model: unknown): void {
    const resolvedModel = asString(model);
    if (!resolvedModel) {
      return;
    }
    this.deps.emit(threadId, {
      type: "system",
      provider: PROVIDER,
      data: {
        model: resolvedModel,
      },
      timestamp: nowIso(),
      uuid: `${crypto.randomUUID()}::model`,
    });
  }

  emitCachedUsageLimits(threadId: string): void {
    if (!this.lastUsageLimits) {
      return;
    }
    this.emitUsageLimits(
      threadId,
      buildUsageLimitsPayload(
        this.lastUsageLimits as NonNullable<CodexUsageLimits>
      )
    );
  }

  registerUsageLimitsSnapshot(
    snapshot: unknown
  ): CodexUsageLimitsStreamPayload | null {
    const usageLimits = buildUsageLimits(snapshot as RateLimitSnapshot);
    if (!usageLimits) {
      return null;
    }
    this.lastUsageLimits = usageLimits;
    const payload = buildUsageLimitsPayload(usageLimits);
    for (const threadId of this.deps.listThreadIds()) {
      this.emitUsageLimits(threadId, payload);
    }
    return payload;
  }

  private handleTurnStarted(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    const threadId = asString(params.threadId);
    const turn = isRecord(params.turn) ? params.turn : null;
    const turnId = asString(turn?.id);
    if (!threadId) {
      return;
    }
    const state = this.deps.ensureSessionState(threadId);
    state.activeTurnId = turnId;
    this.deps.emit(threadId, {
      type: "turn_started",
      provider: PROVIDER,
      threadId,
      timestamp: nowIso(),
      uuid: `${crypto.randomUUID()}::turn_started`,
    });
  }

  private handleTurnCompleted(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    const threadId = asString(params.threadId);
    const turn = isRecord(params.turn) ? params.turn : null;
    if (!threadId) {
      return;
    }
    const state = this.deps.ensureSessionState(threadId);
    state.activeTurnId = null;
    const status = asString(turn?.status);
    const error = isRecord(turn?.error) ? turn.error : null;
    if (status === "failed" || error) {
      this.deps.emit(threadId, {
        type: "turn_failed",
        provider: PROVIDER,
        threadId,
        message: asString(error?.message) ?? "Codex turn failed",
        timestamp: nowIso(),
        uuid: `${crypto.randomUUID()}::turn_failed`,
      });
      return;
    }
    this.deps.emit(threadId, {
      type: "turn_completed",
      provider: PROVIDER,
      threadId,
      timestamp: nowIso(),
      uuid: `${crypto.randomUUID()}::turn_completed`,
    });
  }

  private handleTurnError(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    const threadId = asString(params.threadId);
    const error = isRecord(params.error) ? params.error : null;
    if (!threadId) {
      return;
    }
    this.deps.emit(threadId, {
      type: "stream_error",
      provider: PROVIDER,
      threadId,
      message: asString(error?.message) ?? "Codex app-server error",
      timestamp: nowIso(),
      uuid: `${crypto.randomUUID()}::stream_error`,
    });
  }

  private handleAgentMessageDelta(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    const threadId = asString(params.threadId);
    const itemId = asString(params.itemId);
    const delta = asText(params.delta);
    if (!(threadId && itemId && delta !== null)) {
      return;
    }
    const state = this.deps.ensureSessionState(threadId);
    state.assistantTextByItemId.set(
      itemId,
      `${state.assistantTextByItemId.get(itemId) ?? ""}${delta}`
    );
  }

  private handleReasoningSummaryPartAdded(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    const threadId = asString(params.threadId);
    const itemId = asString(params.itemId);
    const summaryIndex = asNumber(params.summaryIndex);
    if (!(threadId && itemId) || summaryIndex === null) {
      return;
    }
    const state = this.deps.ensureSessionState(threadId);
    const summaryParts = state.reasoningSummariesByItemId.get(itemId) ?? [];
    while (summaryParts.length <= summaryIndex) {
      summaryParts.push("");
    }
    state.reasoningSummariesByItemId.set(itemId, summaryParts);
  }

  private handleReasoningSummaryTextDelta(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    const threadId = asString(params.threadId);
    const itemId = asString(params.itemId);
    const delta = asText(params.delta);
    const summaryIndex = asNumber(params.summaryIndex);
    if (!(threadId && itemId && delta !== null) || summaryIndex === null) {
      return;
    }
    const state = this.deps.ensureSessionState(threadId);
    const summaryParts = state.reasoningSummariesByItemId.get(itemId) ?? [];
    while (summaryParts.length <= summaryIndex) {
      summaryParts.push("");
    }
    summaryParts[summaryIndex] = `${summaryParts[summaryIndex] ?? ""}${delta}`;
    state.reasoningSummariesByItemId.set(itemId, summaryParts);
  }

  private handleItemCompleted(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    const threadId = asString(params.threadId);
    const item = isRecord(params.item) ? params.item : null;
    const itemType = asString(item?.type);
    if (!(threadId && item && itemType)) {
      return;
    }
    if (itemType === "agentMessage") {
      this.handleCompletedAgentMessage(threadId, item);
      return;
    }
    if (itemType === "reasoning") {
      this.handleCompletedReasoning(threadId, item);
    }
  }

  private handleCompletedAgentMessage(
    threadId: string,
    item: Record<string, unknown>
  ): void {
    const itemId = asString(item.id);
    const phase = asString(item.phase);
    const state = this.deps.ensureSessionState(threadId);
    const text =
      asText(item.text) ??
      (itemId ? (state.assistantTextByItemId.get(itemId) ?? null) : null);
    if (itemId) {
      state.assistantTextByItemId.delete(itemId);
    }
    if (!text) {
      return;
    }
    if (phase === "final_answer" || phase === null) {
      this.emitDialogMessage(threadId, "assistant", text, itemId);
    }
  }

  private handleCompletedReasoning(
    threadId: string,
    item: Record<string, unknown>
  ): void {
    const itemId = asString(item.id);
    const state = this.deps.ensureSessionState(threadId);
    const summaryFromDeltas = itemId
      ? (state.reasoningSummariesByItemId.get(itemId) ?? [])
      : [];
    if (itemId) {
      state.reasoningSummariesByItemId.delete(itemId);
    }
    const summaryText = summaryFromDeltas.join("").trim();
    const fallbackSummary = asStringArray(item.summary).join("\n").trim();
    const fallbackContent = asStringArray(item.content).join("\n").trim();
    const content = summaryText || fallbackSummary || fallbackContent;
    if (!content) {
      return;
    }
    this.emitDialogMessage(threadId, "thinking", content, itemId);
  }

  private handleThreadTokenUsageUpdated(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    const threadId = asString(params.threadId);
    const tokenUsage = isRecord(params.tokenUsage) ? params.tokenUsage : null;
    const lastUsage = isRecord(tokenUsage?.last) ? tokenUsage.last : null;
    const totalUsage = isRecord(tokenUsage?.total) ? tokenUsage.total : null;
    const used =
      asNumber(lastUsage?.totalTokens) ?? asNumber(totalUsage?.totalTokens);
    const limit = asNumber(tokenUsage?.modelContextWindow);
    if (!(threadId && used !== null && limit !== null)) {
      return;
    }
    this.deps.emit(threadId, {
      type: "stream_event",
      provider: PROVIDER,
      threadId,
      tokenUsage: {
        used,
        limit,
      },
      data: {
        kind: "token_usage",
        used,
        limit,
      },
      timestamp: nowIso(),
      uuid: `${crypto.randomUUID()}::token_usage`,
    });
  }

  private handleAccountRateLimitsUpdated(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    this.registerUsageLimitsSnapshot(params.rateLimits);
  }

  private emitUsageLimits(
    threadId: string,
    payload: CodexUsageLimitsStreamPayload
  ): void {
    this.deps.emit(threadId, {
      type: "stream_event",
      provider: PROVIDER,
      threadId,
      providerScopeKey: payload.providerScopeKey,
      usageLimits: payload.usageLimits,
      data: payload.data,
      timestamp: nowIso(),
      uuid: `${crypto.randomUUID()}::usage_limits`,
    });
  }

  private emitDialogMessage(
    threadId: string,
    role: "assistant" | "thinking",
    content: string,
    itemId: string | null
  ): void {
    const normalized = content.trim();
    if (!normalized) {
      return;
    }
    this.deps.emit(threadId, {
      type: "dialog_message",
      role: role === "thinking" ? "assistant" : role,
      content: normalized,
      uuid: itemId ?? crypto.randomUUID(),
      timestamp: nowIso(),
      ...(role === "thinking" ? { tag: "thinking" } : {}),
    });
  }
}
