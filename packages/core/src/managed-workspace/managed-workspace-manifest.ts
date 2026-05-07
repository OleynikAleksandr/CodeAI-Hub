import type {
  ManagedWorkspaceHookName,
  ManagedWorkspacePathEntry,
  ManagedWorkspacePaths,
} from "./managed-workspace-types";

export const MANAGED_WORKSPACE_MANIFEST_SCHEMA = "codeai-managed-workspace-v1";
export const MANAGED_WORKSPACE_MANIFEST_RELATIVE_PATH =
  ".codeai-hub/workflow/index.json";

export interface ManagedWorkspaceManifestHook {
  readonly hookName: ManagedWorkspaceHookName;
  readonly relativePath: string;
}

export interface ManagedWorkspaceManifestPath {
  readonly kind: string;
  readonly phase: string;
  readonly relativePath: string;
  readonly tracked: boolean;
}

export interface ManagedWorkspaceManifest {
  readonly createdAt: string;
  readonly hooks: readonly ManagedWorkspaceManifestHook[];
  readonly ignoredStateDirectories: readonly string[];
  readonly manifestPath: string;
  readonly paths: readonly ManagedWorkspaceManifestPath[];
  readonly schema: typeof MANAGED_WORKSPACE_MANIFEST_SCHEMA;
  readonly workspaceRoot: string;
}

export const createManagedWorkspaceManifest = (params: {
  readonly createdAt: string;
  readonly paths: ManagedWorkspacePaths;
}): ManagedWorkspaceManifest => {
  const pathEntries = collectManifestPaths(params.paths);
  return {
    schema: MANAGED_WORKSPACE_MANIFEST_SCHEMA,
    createdAt: params.createdAt,
    workspaceRoot: params.paths.workspaceRoot,
    manifestPath: MANAGED_WORKSPACE_MANIFEST_RELATIVE_PATH,
    hooks: params.paths.hooks.map((hook) => ({
      hookName: hook.hookName,
      relativePath: hook.relativePath,
    })),
    ignoredStateDirectories: params.paths.ignoredStateDirectories.map(
      (entry) => entry.relativePath
    ),
    paths: pathEntries.map(toManifestPath),
  };
};

export const serializeManagedWorkspaceManifest = (
  manifest: ManagedWorkspaceManifest
): string => `${JSON.stringify(manifest, null, 2)}\n`;

const collectManifestPaths = (
  paths: ManagedWorkspacePaths
): readonly ManagedWorkspacePathEntry[] => [
  paths.controlPlaneRoot,
  paths.hookDirectory,
  ...paths.hooks,
  ...paths.ignoredStateDirectories,
  paths.packageManifest,
  paths.planCommandDirectory,
  paths.todoPlan,
  paths.workflowCheckDirectory,
  paths.workflowMigrationDirectory,
  ...paths.workflowRevisionDirectories,
];

const toManifestPath = (
  entry: ManagedWorkspacePathEntry
): ManagedWorkspaceManifestPath => ({
  kind: entry.kind,
  phase: entry.phase,
  relativePath: entry.relativePath,
  tracked: entry.tracked,
});
