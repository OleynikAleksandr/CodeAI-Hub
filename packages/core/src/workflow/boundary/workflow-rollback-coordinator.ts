import { execFile } from "node:child_process";
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  resolveWorkspaceRuntimeCapsule,
  type WorkspaceRuntimeCapsule,
} from "../runtime/workspace-runtime-capsule";
import { WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT } from "../runtime/workspace-runtime-capsule-gitignore";
import {
  isWorkspaceRollbackIgnoredRuntimePath,
  readWorkspaceSettingsRollbackSnapshot,
  restoreWorkspaceSettingsRollbackSnapshot,
  untrackWorkspaceRollbackIgnoredRuntimePaths,
  untrackWorkspaceSettingsForRollback,
} from "../runtime/workspace-settings-rollback-ignore";
import type { WorkflowStageId } from "../watcher/watcher-types";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import {
  buildWorkflowClearCommitMessage,
  type WorkflowBoundaryGitLogEntry,
  type WorkflowBoundaryRestoreResult,
} from "./workflow-boundary-model";
import { WorkflowBoundaryRegistryStore } from "./workflow-boundary-registry";

const execFileAsync = promisify(execFile);

export interface WorkflowRollbackQuiesceParams {
  readonly boundaryHash: string;
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface WorkflowRollbackCoordinatorOptions {
  readonly git?: WorkflowBoundaryGit;
  readonly quiesce?: (params: WorkflowRollbackQuiesceParams) => Promise<void>;
  readonly registryStore?: WorkflowBoundaryRegistryStore;
}

export interface WorkflowRollbackCoordinatorParams {
  readonly prunedStages: readonly WorkflowStageId[];
  readonly stage: WorkflowStageId;
  readonly target: WorkflowBoundaryGitLogEntry;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const formatDirtyRollbackError = (paths: readonly string[]): string =>
  [
    "Workflow rollback finished with a dirty Git tree.",
    "Clear must leave the workspace exactly on a committed Git state.",
    "Remaining paths:",
    ...paths.map((value) => `- ${value}`),
  ].join("\n");

const defaultQuiesce = async (): Promise<void> => undefined;

const writeCurrentRuntimeGitignore = async (params: {
  readonly absolutePath: string;
}): Promise<void> => {
  await mkdir(path.dirname(params.absolutePath), { recursive: true });
  await writeFile(
    params.absolutePath,
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT,
    "utf8"
  );
};

type RollbackIgnoredRuntimeSnapshot = readonly {
  readonly content: Buffer | null;
  readonly relativePath: string;
}[];

interface DevelopmentTreeRollbackPreserveSnapshot {
  readonly continuityIndexEntries: readonly JsonRecord[];
  readonly continuityIndexPath: string;
  readonly continuityIndexUpdatedAt: string | null;
  readonly entries: readonly PreservedFileEntry[];
  readonly rootPaths: readonly string[];
  readonly workspaceSlug: string;
}

interface PreservedFileEntry {
  readonly content: Buffer;
  readonly relativePath: string;
}

type JsonRecord = Record<string, unknown>;

const isMissingFileError = (error: unknown): boolean =>
  (error as { readonly code?: unknown }).code === "ENOENT";

const DEVELOPMENT_TREE_PRESERVE_STAGES = new Set<WorkflowStageId>([
  "application_skeleton",
  "quality_gates",
]);
const DEVELOPMENT_TREE_STAGE_PREFIX = "development_tree/";
const CONTINUITY_INDEX_PATH_SUFFIX = "continuity/index.json";

const buildDevelopmentTreePreserveRoots = (
  workspaceSlug: string
): readonly string[] => [
  `.codeai-hub/${workspaceSlug}/development_tree`,
  `.codeai-hub/${workspaceSlug}/workflow/managed/development-tree-product-parts`,
  `.codeai-hub/${workspaceSlug}/workflow/managed/development-tree-clusters`,
  `.codeai-hub/${workspaceSlug}/continuity/development_tree`,
  "doc/TODO/stages/development-tree",
];

const buildContinuityIndexPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/${CONTINUITY_INDEX_PATH_SUFFIX}`;

const isJsonRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJsonRecord = async (filePath: string): Promise<JsonRecord | null> => {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    return isJsonRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readJsonEntries = (value: JsonRecord | null): readonly JsonRecord[] => {
  const entries = value?.entries;
  return Array.isArray(entries) ? entries.filter(isJsonRecord) : [];
};

const isDevelopmentTreeContinuityEntry = (entry: JsonRecord): boolean =>
  typeof entry.stage === "string" &&
  entry.stage.startsWith(DEVELOPMENT_TREE_STAGE_PREFIX);

const collectPreservedFiles = async (params: {
  readonly absolutePath: string;
  readonly relativePath: string;
}): Promise<readonly PreservedFileEntry[]> => {
  const stats = await lstat(params.absolutePath).catch((error: unknown) => {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  });
  if (!stats) {
    return [];
  }
  if (stats.isFile()) {
    return [
      {
        content: await readFile(params.absolutePath),
        relativePath: params.relativePath,
      },
    ];
  }
  if (!stats.isDirectory()) {
    return [];
  }
  const entries = await readdir(params.absolutePath, { withFileTypes: true });
  const preserved: PreservedFileEntry[] = [];
  for (const entry of entries) {
    preserved.push(
      ...(await collectPreservedFiles({
        absolutePath: path.join(params.absolutePath, entry.name),
        relativePath: path.posix.join(params.relativePath, entry.name),
      }))
    );
  }
  return preserved;
};

const readDevelopmentTreeRollbackPreserveSnapshot = async (params: {
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DevelopmentTreeRollbackPreserveSnapshot | null> => {
  if (!DEVELOPMENT_TREE_PRESERVE_STAGES.has(params.stage)) {
    return null;
  }
  const rootPaths = buildDevelopmentTreePreserveRoots(params.workspaceSlug);
  const entries: PreservedFileEntry[] = [];
  for (const relativePath of rootPaths) {
    entries.push(
      ...(await collectPreservedFiles({
        absolutePath: path.join(params.workspaceRoot, relativePath),
        relativePath,
      }))
    );
  }
  const continuityIndexPath = buildContinuityIndexPath(params.workspaceSlug);
  const continuityIndex = await readJsonRecord(
    path.join(params.workspaceRoot, continuityIndexPath)
  );
  const continuityIndexUpdatedAt =
    typeof continuityIndex?.updatedAt === "string"
      ? continuityIndex.updatedAt
      : null;
  return {
    continuityIndexEntries: readJsonEntries(continuityIndex).filter(
      isDevelopmentTreeContinuityEntry
    ),
    continuityIndexPath,
    continuityIndexUpdatedAt,
    entries,
    rootPaths,
    workspaceSlug: params.workspaceSlug,
  };
};

const mergeContinuityIndex = async (params: {
  readonly snapshot: DevelopmentTreeRollbackPreserveSnapshot;
  readonly workspaceRoot: string;
}): Promise<boolean> => {
  const absolutePath = path.join(
    params.workspaceRoot,
    params.snapshot.continuityIndexPath
  );
  const existing = await readJsonRecord(absolutePath);
  const existingEntries = readJsonEntries(existing);
  const nonDevelopmentTreeEntries = existingEntries.filter(
    (entry) => !isDevelopmentTreeContinuityEntry(entry)
  );
  const hadDevelopmentTreeEntries =
    nonDevelopmentTreeEntries.length !== existingEntries.length;
  if (
    params.snapshot.continuityIndexEntries.length === 0 &&
    !hadDevelopmentTreeEntries
  ) {
    return false;
  }
  const next = {
    version: 1,
    workspaceSlug:
      typeof existing?.workspaceSlug === "string"
        ? existing.workspaceSlug
        : params.snapshot.workspaceSlug,
    updatedAt:
      params.snapshot.continuityIndexUpdatedAt ??
      (typeof existing?.updatedAt === "string" ? existing.updatedAt : ""),
    entries: [
      ...nonDevelopmentTreeEntries,
      ...params.snapshot.continuityIndexEntries,
    ],
  };
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return true;
};

const restoreDevelopmentTreeRollbackPreserveSnapshot = async (params: {
  readonly snapshot: DevelopmentTreeRollbackPreserveSnapshot | null;
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  if (!params.snapshot) {
    return [];
  }
  const pathSpecs = new Set<string>();
  for (const relativePath of params.snapshot.rootPaths) {
    const absolutePath = path.join(params.workspaceRoot, relativePath);
    const existedAfterRollback = await lstat(absolutePath)
      .then(() => true)
      .catch((error: unknown) => {
        if (isMissingFileError(error)) {
          return false;
        }
        throw error;
      });
    await rm(absolutePath, { force: true, recursive: true });
    if (
      existedAfterRollback ||
      params.snapshot.entries.some((entry) =>
        entry.relativePath.startsWith(`${relativePath}/`)
      )
    ) {
      pathSpecs.add(relativePath);
    }
  }
  for (const entry of params.snapshot.entries) {
    const absolutePath = path.join(params.workspaceRoot, entry.relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, entry.content);
  }
  if (
    await mergeContinuityIndex({
      snapshot: params.snapshot,
      workspaceRoot: params.workspaceRoot,
    })
  ) {
    pathSpecs.add(params.snapshot.continuityIndexPath);
  }
  return [...pathSpecs];
};

const readTrackedCapsulePaths = async (params: {
  readonly capsule: WorkspaceRuntimeCapsule;
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "-z", "--", params.capsule.workspaceCapsuleRoot.relativePath],
    { cwd: params.workspaceRoot }
  ).catch(() => ({ stdout: "" }));
  return stdout.split("\0").filter((value) => value.length > 0);
};

const readRollbackIgnoredRuntimeSnapshot = async (params: {
  readonly capsule: WorkspaceRuntimeCapsule;
  readonly workspaceRoot: string;
}): Promise<RollbackIgnoredRuntimeSnapshot> => {
  const entries: RollbackIgnoredRuntimeSnapshot[number][] = [];
  for (const relativePath of await readTrackedCapsulePaths(params)) {
    if (
      !isWorkspaceRollbackIgnoredRuntimePath({
        capsule: params.capsule,
        relativePath,
      })
    ) {
      continue;
    }
    try {
      entries.push({
        content: await readFile(path.join(params.workspaceRoot, relativePath)),
        relativePath,
      });
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
      entries.push({ content: null, relativePath });
    }
  }
  return entries;
};

const restoreRollbackIgnoredRuntimeSnapshot = async (params: {
  readonly snapshot: RollbackIgnoredRuntimeSnapshot;
  readonly workspaceRoot: string;
}): Promise<void> => {
  for (const entry of params.snapshot) {
    const absolutePath = path.join(params.workspaceRoot, entry.relativePath);
    if (entry.content === null) {
      await rm(absolutePath, { force: true });
      continue;
    }
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, entry.content);
  }
};

export class WorkflowRollbackCoordinator {
  readonly #git: WorkflowBoundaryGit;
  readonly #quiesce: (params: WorkflowRollbackQuiesceParams) => Promise<void>;
  readonly #registryStore: WorkflowBoundaryRegistryStore;

  constructor(options: WorkflowRollbackCoordinatorOptions = {}) {
    this.#git = options.git ?? new WorkflowBoundaryGit();
    this.#quiesce = options.quiesce ?? defaultQuiesce;
    this.#registryStore =
      options.registryStore ?? new WorkflowBoundaryRegistryStore();
  }

  async rollback(
    params: WorkflowRollbackCoordinatorParams
  ): Promise<WorkflowBoundaryRestoreResult> {
    const capsule = resolveWorkspaceRuntimeCapsule(params);
    await this.#quiesce({
      boundaryHash: params.target.boundaryHash,
      stage: params.stage,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const settingsSnapshot = await readWorkspaceSettingsRollbackSnapshot(
      capsule.settingsFile
    );
    const runtimeSnapshot = await readRollbackIgnoredRuntimeSnapshot({
      capsule,
      workspaceRoot: params.workspaceRoot,
    });
    const developmentTreeSnapshot =
      await readDevelopmentTreeRollbackPreserveSnapshot(params);
    await this.#git.resetHard({
      hash: params.target.boundaryHash,
      workspaceRoot: params.workspaceRoot,
    });
    await writeCurrentRuntimeGitignore(capsule.gitignoreFile);
    await this.#git.cleanWorktree({ workspaceRoot: params.workspaceRoot });
    await writeCurrentRuntimeGitignore(capsule.gitignoreFile);
    await restoreRollbackIgnoredRuntimeSnapshot({
      snapshot: runtimeSnapshot,
      workspaceRoot: params.workspaceRoot,
    });
    await restoreWorkspaceSettingsRollbackSnapshot({
      settingsFile: capsule.settingsFile,
      snapshot: settingsSnapshot,
    });
    const developmentTreePreservedPaths =
      await restoreDevelopmentTreeRollbackPreserveSnapshot({
        snapshot: developmentTreeSnapshot,
        workspaceRoot: params.workspaceRoot,
      });
    await untrackWorkspaceRollbackIgnoredRuntimePaths({
      capsule,
      workspaceRoot: params.workspaceRoot,
    });
    await untrackWorkspaceSettingsForRollback({
      settingsFile: capsule.settingsFile,
      workspaceRoot: params.workspaceRoot,
    });
    const projection = await this.rebuildProjection(params);
    const clearCommit = await this.#git.commit({
      allowEmpty: true,
      commitMessage: buildWorkflowClearCommitMessage(params.stage),
      paths: [
        path.relative(params.workspaceRoot, projection.registryPath),
        capsule.gitignoreFile.relativePath,
        ...developmentTreePreservedPaths,
      ],
      workspaceRoot: params.workspaceRoot,
    });
    await this.assertCleanWorktree(params.workspaceRoot);
    return {
      boundaryHash: params.target.boundaryHash,
      clearCommitHash: clearCommit.hash,
      prunedStages: projection.prunedStages,
      registryPath: projection.registryPath,
      stage: params.stage,
    };
  }

  private async rebuildProjection(
    params: WorkflowRollbackCoordinatorParams
  ): Promise<{
    readonly prunedStages: readonly WorkflowStageId[];
    readonly registryPath: string;
  }> {
    const prunedRegistry = await this.#registryStore.pruneFromStage(params);
    const registryPath = await this.#registryStore.write({
      ...params,
      registry: prunedRegistry,
    });
    return {
      prunedStages: params.prunedStages.filter((stage) =>
        prunedRegistry.entries.every((entry) => entry.stage !== stage)
      ),
      registryPath,
    };
  }

  private async assertCleanWorktree(workspaceRoot: string): Promise<void> {
    const dirtyPaths = await this.#git.statusPorcelain(workspaceRoot);
    if (dirtyPaths.length > 0) {
      throw new Error(formatDirtyRollbackError(dirtyPaths));
    }
  }
}
