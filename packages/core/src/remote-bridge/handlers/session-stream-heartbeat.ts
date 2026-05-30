interface HeartbeatSession {
  readonly id: string;
  readonly stage?: string | null;
  readonly workspacePath?: string;
}

interface HeartbeatDeps {
  readonly sessionManager: {
    getSession(sessionId: string): HeartbeatSession | null | undefined;
  };
  readonly workspaceRuntime?: {
    recordHeartbeat(sessionKey: {
      readonly nodeId: string;
      readonly sessionId: string;
      readonly workspaceRoot: string;
    }): void;
  };
}

/**
 * Record a stream heartbeat for the active session so the workspace task timer
 * keeps accumulating while the provider streams. Extracted from the provider
 * event router to keep that file within the architecture line budget.
 */
export const recordSessionStreamHeartbeat = (
  deps: HeartbeatDeps,
  sessionId: string
): void => {
  const session = deps.sessionManager.getSession(sessionId);
  if (!session?.workspacePath) {
    return;
  }
  deps.workspaceRuntime?.recordHeartbeat({
    workspaceRoot: session.workspacePath,
    nodeId: session.stage ?? "session",
    sessionId: session.id,
  });
};
