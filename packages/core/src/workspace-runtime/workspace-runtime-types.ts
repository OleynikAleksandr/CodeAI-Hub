export interface NodeKey {
  readonly nodeId: string;
  readonly workspaceRoot: string;
}

export interface SessionKey {
  readonly nodeId: string;
  readonly sessionId: string;
  readonly workspaceRoot: string;
}

export type WorkspaceLoadState = "loading" | "ready" | "error";

export type NodeStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "DONE"
  | "BLOCKED"
  | "OUTDATED"
  | "ERROR";

export interface NodeSnapshot extends Record<string, unknown> {
  readonly deps?: readonly string[];
  readonly label?: string;
  readonly reason?: string | null;
  readonly status: NodeStatus;
  readonly updatedAt?: string;
}

export type SessionTurnState = "idle" | "running";

export type SessionBindingStatus = "pending" | "ready" | "failed";

export type SessionResumeMode =
  | "no_resume"
  | "resume_in_place"
  | "resume_via_rollover";

export type SessionTerminalLockReason = "terminal_no_resume";

export interface SessionTaskTimerSnapshot {
  /**
   * Epoch time in ms when the current busy segment started, or null if idle.
   */
  readonly runningSinceMs: number | null;
  /**
   * Accumulated busy/wait time in whole seconds for the workflow node.
   * Does not include the currently-running busy segment (if any).
   */
  readonly totalSeconds: number;
}

export type SessionContinuityLockReason =
  | "context_check_pending"
  | "threshold_reached"
  | "report_in_progress"
  | "resume_bootstrap"
  | "no_rollover_needed"
  | "resume_ready"
  | "resume_failed"
  | "resume_timeout"
  | SessionTerminalLockReason;

export interface SessionContinuityLockTransition {
  readonly awaitingBootstrapTurn: boolean;
  readonly finalTurnCompleted?: boolean;
  readonly reason: SessionContinuityLockReason;
  readonly resumeMode?: SessionResumeMode;
  readonly rolloverId: string;
  readonly rolloverPending?: boolean;
  readonly runSlug?: string | null;
  readonly sourceSessionId: string;
  readonly stageId?: string;
  readonly targetSessionId?: string;
  readonly terminalLockReason?: SessionTerminalLockReason;
  readonly updatedAt: string;
}

export interface SessionSnapshot extends Record<string, unknown> {
  readonly bindingStatus?: SessionBindingStatus;
  readonly continuityLockActive: boolean;
  readonly continuityLockReason?: SessionContinuityLockReason;
  readonly continuityLockTransition?: SessionContinuityLockTransition;
  readonly finalTurnCompleted?: boolean;
  readonly lastHeartbeatAt?: string;
  readonly nodeId: string;
  readonly providerId?: string;
  readonly providerSessionId?: string;
  readonly resumeMode?: SessionResumeMode;
  readonly taskTimer?: SessionTaskTimerSnapshot;
  readonly terminalLockReason?: SessionTerminalLockReason;
  readonly turnState: SessionTurnState;
}

export interface ArtifactPointer extends Record<string, unknown> {
  readonly artifactId: string;
  readonly path: string;
  readonly updatedAt?: string;
  readonly version: string;
}

export interface WorkspaceSnapshot {
  readonly artifacts: {
    readonly currentByNodeId: Readonly<
      Record<string, Readonly<Record<string, ArtifactPointer>>>
    >;
  };
  readonly error?: string | null;
  readonly loadState: WorkspaceLoadState;
  readonly sessions: Readonly<Record<string, SessionSnapshot>>;
  readonly workflow: {
    readonly nodes: Readonly<Record<string, NodeSnapshot>>;
  };
  readonly workspaceRoot: string;
}
