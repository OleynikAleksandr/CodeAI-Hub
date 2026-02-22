import type { ProviderStackId } from "./provider";

export type SessionMessageRole = "system" | "assistant" | "user" | "thinking";

export type SessionMessage = {
  readonly id: string;
  readonly role: SessionMessageRole;
  readonly content: string;
  readonly createdAt: number;
};

export type SessionBindingInfo = {
  readonly providerSessionId: string | null;
  readonly status: "pending" | "ready" | "failed";
};

export type SessionTodoItem = {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
};

/**
 * Information about a model used in a session.
 * Includes provider context, model identifier, and reasoning level if applicable.
 */
export type ModelInfo = {
  readonly providerId: ProviderStackId;
  readonly providerName: string;
  readonly modelId: string;
  readonly modelDisplayName: string;
  readonly reasoning?: string;
};

export type SessionStatusInfo = {
  readonly providerSummary: string;
  readonly models?: readonly ModelInfo[];
  readonly rollover?: FlowNodeRolloverInfo | null;
  readonly continuityLock?: SessionContinuityLockInfo;
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
  readonly tokenUsage: {
    readonly used: number;
    readonly limit: number;
  };
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
  readonly connectionState: "idle" | "running" | "blocked";
  readonly updatedAt: number;
};

export type SessionContinuityLockInfo = {
  readonly active: boolean;
  readonly rolloverId?: string;
  readonly sourceSessionId?: string;
  readonly targetSessionId?: string;
  readonly reason?: string;
  readonly updatedAt: number;
};

export type FlowNodeRolloverInfo = {
  readonly phase: string;
  readonly remainingPercent?: number;
  readonly thresholdPercent?: number;
  readonly reportPath?: string;
  readonly error?: string;
  readonly updatedAt: number;
};

/**
 * Kind of session agent within a workflow stage.
 * - "collector": Initial agent that gathers information (e.g., Description agent)
 * - "reviewer": Agent that reviews and refines output (e.g., Reviewer)
 */
export type SessionKind = "collector" | "reviewer";

export type SessionRecord = {
  readonly id: string;
  readonly title: string;
  readonly providerIds: readonly ProviderStackId[];
  readonly workspacePath: string;
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly runSlug?: string | null;
  readonly sessionKind?: SessionKind | null;
  readonly continuationParentId?: string | null;
  readonly continuationIndex?: number | null;
  readonly createdAt: number;
  readonly binding: SessionBindingInfo;
};

export type SessionSnapshot = {
  readonly messages: readonly SessionMessage[];
  readonly todos: readonly SessionTodoItem[];
  readonly status: SessionStatusInfo;
  readonly draft: string;
  readonly binding: SessionBindingInfo;
};
