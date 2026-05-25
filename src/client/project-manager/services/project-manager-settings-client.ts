export interface WorkspaceSettingsScopePayload {
  readonly workspacePath?: string | null;
  readonly workspaceSlug?: string | null;
}

export const resolveWorkspaceSettingsScope = (
  scope: WorkspaceSettingsScopePayload
): WorkspaceSettingsScopePayload | undefined =>
  scope.workspacePath && scope.workspaceSlug
    ? {
        workspacePath: scope.workspacePath,
        workspaceSlug: scope.workspaceSlug,
      }
    : undefined;
