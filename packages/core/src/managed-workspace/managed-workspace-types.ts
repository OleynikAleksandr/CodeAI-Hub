export type ManagedWorkspaceHookName =
  | "commit-msg"
  | "post-checkout"
  | "post-commit"
  | "pre-commit"
  | "pre-push";

export type ManagedWorkspaceLifecyclePhase =
  | "baseline"
  | "quality_gates"
  | "revision_graph";

export type ManagedWorkspacePathKind =
  | "control_plane_directory"
  | "hook_file"
  | "ignored_state_directory"
  | "package_manifest"
  | "plan_command_directory"
  | "todo_plan"
  | "workflow_check_directory"
  | "workflow_migration_directory"
  | "workflow_revision_directory";

export interface ManagedWorkspacePathEntry {
  readonly absolutePath: string;
  readonly kind: ManagedWorkspacePathKind;
  readonly phase: ManagedWorkspaceLifecyclePhase;
  readonly relativePath: string;
  readonly tracked: boolean;
}

export interface ManagedWorkspaceHookPath extends ManagedWorkspacePathEntry {
  readonly hookName: ManagedWorkspaceHookName;
  readonly kind: "hook_file";
}

export interface ManagedWorkspacePaths {
  readonly controlPlaneRoot: ManagedWorkspacePathEntry;
  readonly hookDirectory: ManagedWorkspacePathEntry;
  readonly hooks: readonly ManagedWorkspaceHookPath[];
  readonly ignoredStateDirectories: readonly ManagedWorkspacePathEntry[];
  readonly packageManifest: ManagedWorkspacePathEntry;
  readonly planCommandDirectory: ManagedWorkspacePathEntry;
  readonly todoPlan: ManagedWorkspacePathEntry;
  readonly workflowCheckDirectory: ManagedWorkspacePathEntry;
  readonly workflowMigrationDirectory: ManagedWorkspacePathEntry;
  readonly workflowRevisionDirectories: readonly ManagedWorkspacePathEntry[];
  readonly workspaceRoot: string;
}

export interface ManagedWorkspacePathRequest {
  readonly workspaceRoot: string;
}

export type ManagedWorkspacePathResult =
  | { readonly ok: true; readonly value: ManagedWorkspacePaths }
  | { readonly ok: false; readonly error: string };
