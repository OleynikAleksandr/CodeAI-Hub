const joinUrl = (baseUrl: string, relativePath: string): string =>
  baseUrl.endsWith("/")
    ? `${baseUrl.slice(0, -1)}${relativePath}`
    : `${baseUrl}${relativePath}`;

export const activateWorkspace = async (params: {
  readonly httpUrl: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await fetch(joinUrl(params.httpUrl, "/api/v1/orchestrator/workspace-activate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
    }),
  });
};

