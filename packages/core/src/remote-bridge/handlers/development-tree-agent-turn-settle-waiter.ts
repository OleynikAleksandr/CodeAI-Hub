import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";

const DEVELOPMENT_TREE_AGENT_TURN_POLL_MS = 250;
const DEVELOPMENT_TREE_AGENT_TURN_TIMEOUT_MS = 15 * 60 * 1000;

export type DevelopmentTreeAgentTurnSettleResult =
  | "settled"
  | "timeout"
  | "unavailable";

const wait = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

export const waitForDevelopmentTreeAgentTurnSettled = async (options: {
  readonly sessionId: string;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
  readonly workspaceRoot: string;
}): Promise<DevelopmentTreeAgentTurnSettleResult> => {
  const workspaceRuntime = options.workspaceRuntime;
  if (!workspaceRuntime) {
    return "unavailable";
  }
  const deadline = Date.now() + DEVELOPMENT_TREE_AGENT_TURN_TIMEOUT_MS;
  let sawRunning = false;
  while (Date.now() < deadline) {
    const session = workspaceRuntime.getSnapshot(options.workspaceRoot)
      .sessions[options.sessionId];
    if (!session) {
      if (sawRunning) {
        return "settled";
      }
      await wait(DEVELOPMENT_TREE_AGENT_TURN_POLL_MS);
      continue;
    }
    if (session.turnState === "running") {
      sawRunning = true;
    }
    if (
      session.turnState === "idle" &&
      (sawRunning || session.lastHeartbeatAt)
    ) {
      return "settled";
    }
    await wait(DEVELOPMENT_TREE_AGENT_TURN_POLL_MS);
  }
  return "timeout";
};
