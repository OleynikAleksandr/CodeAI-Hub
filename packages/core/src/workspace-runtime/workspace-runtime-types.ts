export type NodeKey = {
  readonly workspaceRoot: string;
  readonly nodeId: string;
};

export type SessionKey = {
  readonly workspaceRoot: string;
  readonly nodeId: string;
  readonly sessionId: string;
};

export type WorkspaceLoadState = "loading" | "ready" | "error";

export type NodeStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "DONE"
  | "BLOCKED"
  | "OUTDATED"
  | "ERROR";

export type NodeSnapshot = {
  readonly status: NodeStatus;
  readonly deps?: readonly string[];
  readonly label?: string;
  readonly reason?: string | null;
  readonly updatedAt?: string;
};

export type SessionTurnState = "idle" | "running";

export type SessionBindingStatus = "pending" | "ready" | "failed";

export type SessionResumeMode =
  | "no_resume"
  | "resume_in_place"
  | "resume_via_rollover";

export type SessionTerminalLockReason = "terminal_no_resume";

export type SessionTaskTimerSnapshot = {
  /**
   * Accumulated busy/wait time in whole seconds for the workflow node.
   * Does not include the currently-running busy segment (if any).
   */
  readonly totalSeconds: number;
  /**
   * Epoch time in ms when the current busy segment started, or null if idle.
   */
  readonly runningSinceMs: number | null;
};

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

export type SessionContinuityLockTransition = {
  readonly rolloverId: string;
  readonly sourceSessionId: string;
  readonly targetSessionId?: string;
  readonly stageId?: string;
  readonly runSlug?: string | null;
  readonly reason: SessionContinuityLockReason;
  readonly rolloverPending?: boolean;
  readonly awaitingBootstrapTurn: boolean;
  readonly resumeMode?: SessionResumeMode;
  readonly finalTurnCompleted?: boolean;
  readonly terminalLockReason?: SessionTerminalLockReason;
  readonly updatedAt: string;
};

export type SessionSnapshot = {
  readonly nodeId: string;
  readonly turnState: SessionTurnState;
  readonly continuityLockActive: boolean;
  readonly continuityLockReason?: SessionContinuityLockReason;
  readonly continuityLockTransition?: SessionContinuityLockTransition;
  readonly resumeMode?: SessionResumeMode;
  readonly finalTurnCompleted?: boolean;
  readonly terminalLockReason?: SessionTerminalLockReason;
  readonly lastHeartbeatAt?: string;
  readonly providerId?: string;
  readonly providerSessionId?: string;
  readonly bindingStatus?: SessionBindingStatus;
  readonly taskTimer?: SessionTaskTimerSnapshot;
};

export type ArtifactPointer = {
  readonly artifactId: string;
  readonly version: string;
  readonly path: string;
  readonly updatedAt?: string;
};

export type WorkspaceSnapshot = {
  readonly workspaceRoot: string;
  readonly loadState: WorkspaceLoadState;
  readonly error?: string | null;
  readonly workflow: {
    readonly nodes: Readonly<Record<string, NodeSnapshot>>;
  };
  readonly sessions: Readonly<Record<string, SessionSnapshot>>;
  readonly artifacts: {
    readonly currentByNodeId: Readonly<
      Record<string, Readonly<Record<string, ArtifactPointer>>>
    >;
  };
};
