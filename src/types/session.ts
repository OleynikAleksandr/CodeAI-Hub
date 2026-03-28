import type { ProviderStackId } from "./provider";

export type SessionMessageRole = "system" | "assistant" | "user" | "thinking";

export interface SessionMessage {
  readonly content: string;
  readonly createdAt: number;
  readonly id: string;
  readonly role: SessionMessageRole;
  readonly tag?: string;
}

export interface SessionBindingInfo {
  readonly providerSessionId: string | null;
  readonly status: "pending" | "ready" | "failed";
}

export interface SessionTodoItem {
  readonly completed: boolean;
  readonly id: string;
  readonly title: string;
}

/**
 * Information about a model used in a session.
 * Includes provider context, model identifier, and reasoning level if applicable.
 */
export interface ModelInfo {
  readonly modelDisplayName: string;
  readonly modelId: string;
  readonly providerId: ProviderStackId;
  readonly providerName: string;
  readonly reasoning?: string;
  readonly source?: "settings" | "runtime";
}

export type SessionUsageLimitLabels = {
  readonly currentSession?: string | null;
  readonly currentWeekAllModels?: string | null;
  readonly currentWeekSonnetOnly?: string | null;
} | null;

export interface SessionStatusInfo {
  readonly connectionState: "idle" | "running" | "blocked";
  readonly continuityLock?: SessionContinuityLockInfo;
  readonly models?: readonly ModelInfo[];
  readonly providerScopeKey?: string | null;
  readonly providerSummary: string;
  readonly rollover?: FlowNodeRolloverInfo | null;
  readonly taskTimer?: {
    /**
     * Accumulated busy/wait time in whole seconds for the workflow agent.
     * Does not include the currently-running busy segment (if any).
     */
    readonly totalSeconds: number;
    /**
     * Epoch time in ms when the current busy segment started, or null if idle.
     */
    readonly runningSinceMs: number | null;
  };
  readonly tokenUsage: {
    readonly used: number;
    readonly limit: number;
  };
  readonly updatedAt: number;
  readonly usageLimitLabels?: SessionUsageLimitLabels;
  readonly usageLimits?: {
    readonly currentSession?: {
      readonly percentUsed: number;
      readonly resetsAt?: string | null;
    } | null;
    readonly currentWeekAllModels?: {
      readonly percentUsed: number;
      readonly resetsAt?: string | null;
    } | null;
    readonly currentWeekSonnetOnly?: {
      readonly percentUsed: number;
      readonly resetsAt?: string | null;
    } | null;
  } | null;
}

export interface SessionContinuityLockInfo {
  readonly active: boolean;
  readonly reason?: string;
  readonly rolloverId?: string;
  readonly sourceSessionId?: string;
  readonly targetSessionId?: string;
  readonly updatedAt: number;
}

export interface FlowNodeRolloverInfo {
  readonly error?: string;
  readonly phase: string;
  readonly remainingPercent?: number;
  readonly reportPath?: string;
  readonly thresholdPercent?: number;
  readonly updatedAt: number;
}

/**
 * Kind of session agent within a workflow stage.
 * Active workflow uses collector-only semantics.
 */
export type SessionKind = "collector";

export interface SessionRecord {
  readonly binding: SessionBindingInfo;
  readonly continuationIndex?: number | null;
  readonly continuationParentId?: string | null;
  readonly createdAt: number;
  readonly id: string;
  readonly initiativeSlug?: string | null;
  readonly providerIds: readonly ProviderStackId[];
  readonly runSlug?: string | null;
  readonly sessionKind?: SessionKind | null;
  readonly stage?: string | null;
  readonly title: string;
  readonly workspacePath: string;
}

export interface SessionSnapshot {
  readonly binding: SessionBindingInfo;
  readonly draft: string;
  readonly messages: readonly SessionMessage[];
  readonly status: SessionStatusInfo;
  readonly todos: readonly SessionTodoItem[];
}
