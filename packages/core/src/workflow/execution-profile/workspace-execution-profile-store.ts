import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  WORKSPACE_EXECUTION_PROFILE_VERSION,
  type WorkspaceExecutionProfileSeed,
  type WorkspaceExecutionProfileSnapshot,
} from "./workspace-execution-profile-types";

const ROOT_DIR = ".codeai-hub";
const RUNTIME_DIR = "runtime";
const STATE_FILE_NAME = "execution-profile.json";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isWorkflowStageId = (
  value: unknown
): value is WorkspaceExecutionProfileSnapshot["lockedFromStage"] =>
  value === "description" ||
  value === "virtual_simulation" ||
  value === "diagram_modules" ||
  value === "diagram_facades";

const normalizeWorkspacePath = (value: string): string => path.resolve(value);

const buildStatePath = (workspaceRoot: string, workspaceSlug: string): string =>
  path.join(
    workspaceRoot,
    ROOT_DIR,
    workspaceSlug,
    RUNTIME_DIR,
    STATE_FILE_NAME
  );

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const parseSnapshot = (
  value: unknown,
  fallbackWorkspacePath: string
): WorkspaceExecutionProfileSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }
  const version = value.version;
  const workspaceSlug = readNonEmptyString(value.workspaceSlug);
  const workspacePath = readNonEmptyString(value.workspacePath);
  const lockedAt = readNonEmptyString(value.lockedAt);
  const lockedFromStage = value.lockedFromStage;
  const providerId = readNonEmptyString(value.providerId);
  const modelId = readNonEmptyString(value.modelId);
  if (
    version !== WORKSPACE_EXECUTION_PROFILE_VERSION ||
    !(workspaceSlug && lockedAt && providerId && modelId) ||
    !isWorkflowStageId(lockedFromStage)
  ) {
    return null;
  }
  return {
    version: WORKSPACE_EXECUTION_PROFILE_VERSION,
    workspaceSlug,
    workspacePath: normalizeWorkspacePath(
      workspacePath && path.isAbsolute(workspacePath)
        ? workspacePath
        : fallbackWorkspacePath
    ),
    lockedAt,
    lockedFromStage,
    providerId,
    modelId,
  };
};

export class WorkspaceExecutionProfileStore {
  private readonly clock: () => string;

  constructor(options?: { readonly clock?: () => string }) {
    this.clock = options?.clock ?? (() => new Date().toISOString());
  }

  async read(
    workspaceRoot: string,
    workspaceSlug: string
  ): Promise<WorkspaceExecutionProfileSnapshot | null> {
    const snapshot = await readJson<WorkspaceExecutionProfileSnapshot>(
      buildStatePath(workspaceRoot, workspaceSlug)
    );
    if (!snapshot) {
      return null;
    }
    const parsed = parseSnapshot(snapshot, workspaceRoot);
    if (!parsed || parsed.workspaceSlug !== workspaceSlug) {
      return null;
    }
    if (
      normalizeWorkspacePath(parsed.workspacePath) !==
      normalizeWorkspacePath(workspaceRoot)
    ) {
      return null;
    }
    return parsed;
  }

  async lock(
    workspaceRoot: string,
    workspaceSlug: string,
    seed: WorkspaceExecutionProfileSeed
  ): Promise<WorkspaceExecutionProfileSnapshot> {
    const snapshot: WorkspaceExecutionProfileSnapshot = {
      version: WORKSPACE_EXECUTION_PROFILE_VERSION,
      workspaceSlug,
      workspacePath: normalizeWorkspacePath(workspaceRoot),
      lockedAt: seed.lockedAt ?? this.clock(),
      lockedFromStage: seed.lockedFromStage ?? "description",
      providerId: seed.providerId,
      modelId: seed.modelId,
    };
    await writeJson(buildStatePath(workspaceRoot, workspaceSlug), snapshot);
    return snapshot;
  }
}
