export interface WorkspaceSettingsScopePayload {
  readonly workspacePath?: string | null;
  readonly workspaceSlug?: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const resolveWorkspaceSettingsScope = (
  scope: WorkspaceSettingsScopePayload
): WorkspaceSettingsScopePayload | undefined =>
  scope.workspacePath && scope.workspaceSlug
    ? {
        workspacePath: scope.workspacePath,
        workspaceSlug: scope.workspaceSlug,
      }
    : undefined;

export const isWorkspaceSettingsPayloadForScope = (
  payload: unknown,
  scope: WorkspaceSettingsScopePayload | undefined
): boolean => {
  if (!scope) {
    return !(
      isRecord(payload) &&
      (typeof payload.workspacePath === "string" ||
        typeof payload.workspaceSlug === "string")
    );
  }
  return (
    isRecord(payload) &&
    payload.workspacePath === scope.workspacePath &&
    payload.workspaceSlug === scope.workspaceSlug
  );
};
