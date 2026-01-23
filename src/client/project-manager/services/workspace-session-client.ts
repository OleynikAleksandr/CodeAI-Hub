import { joinUrl, resolveCoreHttpUrl } from "./description-questionnaire-utils";

const WORKSPACE_SESSION_ENDPOINT = "/api/v1/orchestrator/workspace-session";

export const ensureWorkflowWorktree = async (params: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const httpUrl = resolveCoreHttpUrl();
  try {
    await fetch(joinUrl(httpUrl, WORKSPACE_SESSION_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspacePath: params.workspacePath,
        initiativeSlug: params.workspaceSlug,
        stage: "description",
      }),
    });
  } catch {
    // best effort: workspace worktree init + watcher connect
  }
};

