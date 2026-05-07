import path from "node:path";
import type {
  ManagedWorkspaceHookName,
  ManagedWorkspaceHookPath,
  ManagedWorkspaceLifecyclePhase,
  ManagedWorkspacePathEntry,
  ManagedWorkspacePathKind,
  ManagedWorkspacePaths,
} from "./managed-workspace-types";

const CONTROL_PLANE_ROOT = ".codeai-hub/workflow";
const HOOK_DIRECTORY = ".husky";
const PLAN_COMMAND_DIRECTORY = "scripts/plan-orchestrator";
const TODO_PLAN_PATH = "doc/TODO/workspace.plan.md";
const PACKAGE_MANIFEST_PATH = "package.json";

const HOOK_NAMES: readonly ManagedWorkspaceHookName[] = [
  "commit-msg",
  "post-checkout",
  "post-commit",
  "pre-commit",
  "pre-push",
];

const IGNORED_STATE_DIRECTORIES: readonly string[] = [
  ".codeai-hub/runtime",
  ".codeai-hub/logs",
  ".codeai-hub/cache",
];

const WORKFLOW_REVISION_DIRECTORIES: readonly string[] = [
  ".codeai-hub/workflow/revisions/diagram-modules",
  ".codeai-hub/workflow/revisions/application-skeleton",
  ".codeai-hub/workflow/revisions/quality-gates",
];

const toPosixRelativePath = (relativePath: string): string =>
  path.posix.normalize(relativePath.replace(/\\/g, "/"));

const resolveAbsolutePath = (
  workspaceRoot: string,
  relativePath: string
): string => path.resolve(workspaceRoot, relativePath);

const createPathEntry = (params: {
  readonly kind: ManagedWorkspacePathKind;
  readonly phase?: ManagedWorkspaceLifecyclePhase;
  readonly relativePath: string;
  readonly tracked: boolean;
  readonly workspaceRoot: string;
}): ManagedWorkspacePathEntry => {
  const relativePath = toPosixRelativePath(params.relativePath);
  return {
    absolutePath: resolveAbsolutePath(params.workspaceRoot, relativePath),
    kind: params.kind,
    phase: params.phase ?? "baseline",
    relativePath,
    tracked: params.tracked,
  };
};

export const createManagedWorkspacePaths = (
  workspaceRoot: string
): ManagedWorkspacePaths => {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const entry = (
    kind: ManagedWorkspacePathKind,
    relativePath: string,
    tracked: boolean,
    phase?: ManagedWorkspaceLifecyclePhase
  ): ManagedWorkspacePathEntry =>
    createPathEntry({
      kind,
      phase,
      relativePath,
      tracked,
      workspaceRoot: resolvedWorkspaceRoot,
    });

  const hooks: readonly ManagedWorkspaceHookPath[] = HOOK_NAMES.map(
    (hookName) => ({
      ...entry("hook_file", path.posix.join(HOOK_DIRECTORY, hookName), true),
      hookName,
      kind: "hook_file" as const,
    })
  );

  return {
    workspaceRoot: resolvedWorkspaceRoot,
    controlPlaneRoot: entry(
      "control_plane_directory",
      CONTROL_PLANE_ROOT,
      true
    ),
    hookDirectory: entry("control_plane_directory", HOOK_DIRECTORY, true),
    hooks,
    ignoredStateDirectories: IGNORED_STATE_DIRECTORIES.map((relativePath) =>
      entry("ignored_state_directory", relativePath, false)
    ),
    packageManifest: entry("package_manifest", PACKAGE_MANIFEST_PATH, true),
    planCommandDirectory: entry(
      "plan_command_directory",
      PLAN_COMMAND_DIRECTORY,
      true
    ),
    todoPlan: entry("todo_plan", TODO_PLAN_PATH, true),
    workflowCheckDirectory: entry(
      "workflow_check_directory",
      ".codeai-hub/workflow/checks",
      true
    ),
    workflowMigrationDirectory: entry(
      "workflow_migration_directory",
      ".codeai-hub/workflow/migrations",
      true,
      "revision_graph"
    ),
    workflowRevisionDirectories: WORKFLOW_REVISION_DIRECTORIES.map(
      (relativePath) =>
        entry(
          "workflow_revision_directory",
          relativePath,
          true,
          "revision_graph"
        )
    ),
  };
};

export const isManagedWorkspacePathInsideRoot = (
  workspaceRoot: string,
  absolutePath: string
): boolean => {
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedPath = path.resolve(absolutePath);
  return (
    resolvedPath === resolvedRoot ||
    resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)
  );
};
