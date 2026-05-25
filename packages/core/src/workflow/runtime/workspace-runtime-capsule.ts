import path from "node:path";

export type WorkspaceRuntimeProviderId = "codex" | "claude" | "gemini" | "kimi";

export interface WorkspaceRuntimePath {
  readonly absolutePath: string;
  readonly relativePath: string;
}

export interface WorkspaceRuntimeCapsule {
  readonly localizationRoot: WorkspaceRuntimePath;
  readonly logsRoot: WorkspaceRuntimePath;
  readonly projectManagerRoot: WorkspaceRuntimePath;
  readonly providerHomes: Readonly<
    Record<WorkspaceRuntimeProviderId, WorkspaceRuntimePath>
  >;
  readonly providersRoot: WorkspaceRuntimePath;
  readonly runtimeRoot: WorkspaceRuntimePath;
  readonly sessionsRoot: WorkspaceRuntimePath;
  readonly settingsFile: WorkspaceRuntimePath;
  readonly settingsRoot: WorkspaceRuntimePath;
  readonly stateRoot: WorkspaceRuntimePath;
  readonly unifiedSessionsRoot: WorkspaceRuntimePath;
  readonly workspaceCapsuleRoot: WorkspaceRuntimePath;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ResolveWorkspaceRuntimeCapsuleParams {
  readonly workspaceRoot: string;
  readonly workspaceSlug?: string | null;
}

const CAPSULE_ROOT_DIR = ".codeai-hub";
const RUNTIME_ROOT_DIR = "runtime";
const SETTINGS_FILE_NAME = "settings.json";
const WORKSPACE_FALLBACK_SLUG = "workspace";

const PROVIDER_IDS = ["codex", "claude", "gemini", "kimi"] as const;

export const normalizeWorkspaceRuntimeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.match(/[a-z0-9]+/gu);
  return parts?.join("-") || WORKSPACE_FALLBACK_SLUG;
};

const resolveWorkspaceSlug = (
  params: ResolveWorkspaceRuntimeCapsuleParams
): string => {
  const explicitSlug = params.workspaceSlug?.trim();
  if (explicitSlug) {
    return normalizeWorkspaceRuntimeSlug(explicitSlug);
  }
  return normalizeWorkspaceRuntimeSlug(path.basename(params.workspaceRoot));
};

const normalizeRelativeSegments = (
  segments: readonly string[]
): readonly string[] => {
  const parts: string[] = [];
  for (const segment of segments) {
    const splitSegments = segment.replace(/\\/g, "/").split("/");
    for (const part of splitSegments) {
      if (!part || part === ".") {
        continue;
      }
      if (part === "..") {
        throw new Error("Workspace runtime capsule paths cannot escape root.");
      }
      parts.push(part);
    }
  }
  return parts;
};

const buildWorkspaceCapsuleRelativePath = (
  workspaceSlug: string,
  ...segments: readonly string[]
): string =>
  path.posix.join(
    CAPSULE_ROOT_DIR,
    workspaceSlug,
    ...normalizeRelativeSegments(segments)
  );

export const buildWorkspaceRuntimeRelativePath = (
  workspaceSlug: string,
  ...segments: readonly string[]
): string =>
  buildWorkspaceCapsuleRelativePath(
    workspaceSlug,
    RUNTIME_ROOT_DIR,
    ...segments
  );

const resolvePath = (
  workspaceRoot: string,
  relativePath: string
): WorkspaceRuntimePath => ({
  absolutePath: path.resolve(workspaceRoot, relativePath),
  relativePath,
});

const buildRuntimePath = (
  workspaceRoot: string,
  workspaceSlug: string,
  ...segments: readonly string[]
): WorkspaceRuntimePath =>
  resolvePath(
    workspaceRoot,
    buildWorkspaceRuntimeRelativePath(workspaceSlug, ...segments)
  );

const buildProviderHomes = (
  workspaceRoot: string,
  workspaceSlug: string
): Record<WorkspaceRuntimeProviderId, WorkspaceRuntimePath> => {
  const entries = PROVIDER_IDS.map((providerId) => [
    providerId,
    buildRuntimePath(
      workspaceRoot,
      workspaceSlug,
      "providers",
      providerId,
      "home"
    ),
  ]);
  return Object.fromEntries(entries) as Record<
    WorkspaceRuntimeProviderId,
    WorkspaceRuntimePath
  >;
};

export const resolveWorkspaceRuntimeCapsule = (
  params: ResolveWorkspaceRuntimeCapsuleParams
): WorkspaceRuntimeCapsule => {
  const workspaceRoot = path.resolve(params.workspaceRoot);
  const workspaceSlug = resolveWorkspaceSlug(params);
  const settingsRoot = buildRuntimePath(
    workspaceRoot,
    workspaceSlug,
    "settings"
  );
  const sessionsRoot = buildRuntimePath(
    workspaceRoot,
    workspaceSlug,
    "sessions"
  );
  const providersRoot = buildRuntimePath(
    workspaceRoot,
    workspaceSlug,
    "providers"
  );

  return {
    localizationRoot: buildRuntimePath(
      workspaceRoot,
      workspaceSlug,
      "localization"
    ),
    logsRoot: buildRuntimePath(workspaceRoot, workspaceSlug, "logs"),
    projectManagerRoot: buildRuntimePath(
      workspaceRoot,
      workspaceSlug,
      "project-manager"
    ),
    providerHomes: buildProviderHomes(workspaceRoot, workspaceSlug),
    providersRoot,
    runtimeRoot: buildRuntimePath(workspaceRoot, workspaceSlug),
    sessionsRoot,
    settingsFile: buildRuntimePath(
      workspaceRoot,
      workspaceSlug,
      "settings",
      SETTINGS_FILE_NAME
    ),
    settingsRoot,
    stateRoot: buildRuntimePath(workspaceRoot, workspaceSlug, "state"),
    unifiedSessionsRoot: buildRuntimePath(
      workspaceRoot,
      workspaceSlug,
      "sessions",
      "unified"
    ),
    workspaceCapsuleRoot: resolvePath(
      workspaceRoot,
      buildWorkspaceCapsuleRelativePath(workspaceSlug)
    ),
    workspaceRoot,
    workspaceSlug,
  };
};
