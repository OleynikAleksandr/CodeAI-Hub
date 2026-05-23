import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { WorkflowUndoStageId } from "../undo/workflow-step-undo-ledger";

const ROOT_DIR = ".codeai-hub";
const CHECKPOINT_VERSION = 1;
const TEMP_FILE_SUFFIX = ".tmp";

type SnapshotRootKind = "workspace" | "user_space";

interface SnapshotRootSpec {
  readonly absolutePath: string;
  readonly id: string;
  readonly kind: SnapshotRootKind;
}

interface CheckpointFileEntry {
  readonly contentBase64: string;
  readonly path: string;
}

interface CheckpointRoot {
  readonly directories: readonly string[];
  readonly exists: boolean;
  readonly files: readonly CheckpointFileEntry[];
  readonly id: string;
  readonly kind: SnapshotRootKind;
}

export interface WorkflowStepCheckpoint {
  readonly capturedAt: string;
  readonly roots: readonly CheckpointRoot[];
  readonly stage: WorkflowUndoStageId;
  readonly version: 1;
  readonly workspaceSlug: string;
}

export interface WorkflowStepCheckpointStoreOptions {
  readonly clock?: () => string;
  readonly userSpaceRoot?: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const normalizeRelativePath = (value: string): string =>
  value.split(path.sep).join("/");

const stageFileName = (stage: WorkflowUndoStageId): string =>
  `${stage.replace(/[^a-zA-Z0-9._-]+/gu, "__")}.json`;

const createTempPath = (filePath: string): string =>
  path.join(
    path.dirname(filePath),
    `${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}${TEMP_FILE_SUFFIX}`
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const parseCheckpoint = (
  value: unknown,
  params: {
    readonly stage: WorkflowUndoStageId;
    readonly workspaceSlug: string;
  }
): WorkflowStepCheckpoint | null => {
  if (!isRecord(value) || value.version !== CHECKPOINT_VERSION) {
    return null;
  }
  const capturedAt = readString(value.capturedAt);
  if (
    value.stage !== params.stage ||
    value.workspaceSlug !== params.workspaceSlug ||
    !capturedAt ||
    !Array.isArray(value.roots)
  ) {
    return null;
  }
  const roots = value.roots.flatMap((root): CheckpointRoot[] => {
    if (!isRecord(root)) {
      return [];
    }
    const id = readString(root.id);
    const kind =
      root.kind === "workspace" || root.kind === "user_space"
        ? root.kind
        : null;
    if (!(id && kind && typeof root.exists === "boolean")) {
      return [];
    }
    const directories = Array.isArray(root.directories)
      ? root.directories.filter(
          (entry): entry is string => typeof entry === "string"
        )
      : [];
    const files = Array.isArray(root.files)
      ? root.files.flatMap((file): CheckpointFileEntry[] => {
          if (!isRecord(file)) {
            return [];
          }
          const filePath = readString(file.path);
          const contentBase64 = readString(file.contentBase64);
          return filePath && contentBase64
            ? [{ path: filePath, contentBase64 }]
            : [];
        })
      : [];
    return [{ id, kind, exists: root.exists, directories, files }];
  });
  return {
    capturedAt,
    roots,
    stage: params.stage,
    version: CHECKPOINT_VERSION,
    workspaceSlug: params.workspaceSlug,
  };
};

const collectCurrentRelativePaths = async (
  rootPath: string
): Promise<Set<string>> => {
  const paths = new Set<string>();
  const stack = [rootPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const entries = await readdir(current, { withFileTypes: true }).catch(
      () => []
    );
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = normalizeRelativePath(
        path.relative(rootPath, absolutePath)
      );
      paths.add(relativePath);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      }
    }
  }
  return paths;
};

const captureRoot = async (root: SnapshotRootSpec): Promise<CheckpointRoot> => {
  const rootStats = await stat(root.absolutePath).catch(() => null);
  if (!rootStats?.isDirectory()) {
    return {
      directories: [],
      exists: false,
      files: [],
      id: root.id,
      kind: root.kind,
    };
  }
  const directories: string[] = [];
  const files: CheckpointFileEntry[] = [];
  const stack = [root.absolutePath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const entries = await readdir(current, { withFileTypes: true }).catch(
      () => []
    );
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = normalizeRelativePath(
        path.relative(root.absolutePath, absolutePath)
      );
      if (entry.isDirectory()) {
        directories.push(relativePath);
        stack.push(absolutePath);
      } else if (entry.isFile()) {
        files.push({
          contentBase64: (await readFile(absolutePath)).toString("base64"),
          path: relativePath,
        });
      }
    }
  }
  return {
    directories: directories.sort(),
    exists: true,
    files: files.sort((left, right) => left.path.localeCompare(right.path)),
    id: root.id,
    kind: root.kind,
  };
};

const restoreRoot = async (
  root: SnapshotRootSpec,
  checkpointRoot: CheckpointRoot
): Promise<void> => {
  if (!checkpointRoot.exists) {
    await rm(root.absolutePath, { force: true, recursive: true });
    return;
  }
  const keep = new Set([
    ...checkpointRoot.directories,
    ...checkpointRoot.files.map((file) => file.path),
  ]);
  const currentPaths = [
    ...(await collectCurrentRelativePaths(root.absolutePath)),
  ];
  for (const relativePath of currentPaths
    .filter((entry) => !keep.has(entry))
    .sort((left, right) => right.length - left.length)) {
    await rm(path.join(root.absolutePath, relativePath), {
      force: true,
      recursive: true,
    });
  }
  await mkdir(root.absolutePath, { recursive: true });
  for (const directory of checkpointRoot.directories) {
    await mkdir(path.join(root.absolutePath, directory), { recursive: true });
  }
  for (const file of checkpointRoot.files) {
    const absolutePath = path.join(root.absolutePath, file.path);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(file.contentBase64, "base64"));
  }
};

export class WorkflowStepCheckpointStore {
  private readonly clock: () => string;
  private readonly userSpaceRoot: string;
  private readonly workspaceRoot: string;
  private readonly workspaceSlug: string;

  constructor(options: WorkflowStepCheckpointStoreOptions) {
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.userSpaceRoot =
      options.userSpaceRoot ?? path.join(homedir(), ROOT_DIR);
    this.workspaceRoot = path.resolve(options.workspaceRoot);
    this.workspaceSlug = options.workspaceSlug;
  }

  async ensure(stage: WorkflowUndoStageId): Promise<WorkflowStepCheckpoint> {
    const existing = await this.read(stage);
    if (existing) {
      return existing;
    }
    const checkpoint: WorkflowStepCheckpoint = {
      capturedAt: this.clock(),
      roots: await Promise.all(
        this.snapshotRoots().map((root) => captureRoot(root))
      ),
      stage,
      version: CHECKPOINT_VERSION,
      workspaceSlug: this.workspaceSlug,
    };
    await this.write(stage, checkpoint);
    return checkpoint;
  }

  path(stage: WorkflowUndoStageId): string {
    return path.join(
      this.workspaceRoot,
      ROOT_DIR,
      this.workspaceSlug,
      "workflow",
      "checkpoints",
      stageFileName(stage)
    );
  }

  async read(
    stage: WorkflowUndoStageId
  ): Promise<WorkflowStepCheckpoint | null> {
    try {
      const parsed = JSON.parse(
        await readFile(this.path(stage), "utf8")
      ) as unknown;
      return parseCheckpoint(parsed, {
        stage,
        workspaceSlug: this.workspaceSlug,
      });
    } catch {
      return null;
    }
  }

  async restore(stage: WorkflowUndoStageId): Promise<boolean> {
    const checkpoint = await this.read(stage);
    if (!checkpoint) {
      return false;
    }
    const roots = new Map(this.snapshotRoots().map((root) => [root.id, root]));
    for (const checkpointRoot of checkpoint.roots) {
      const root = roots.get(checkpointRoot.id);
      if (root) {
        await restoreRoot(root, checkpointRoot);
      }
    }
    return true;
  }

  private snapshotRoots(): readonly SnapshotRootSpec[] {
    return [
      {
        absolutePath: path.join(
          this.workspaceRoot,
          ROOT_DIR,
          this.workspaceSlug
        ),
        id: "workspace_hub",
        kind: "workspace",
      },
      {
        absolutePath: path.join(this.workspaceRoot, "doc", "TODO", "stages"),
        id: "workspace_stage_todos",
        kind: "workspace",
      },
      {
        absolutePath: path.join(this.workspaceRoot, "product-parts"),
        id: "workspace_product_parts",
        kind: "workspace",
      },
      {
        absolutePath: path.join(
          this.userSpaceRoot,
          "sessions",
          this.workspaceSlug
        ),
        id: "user_space_sessions",
        kind: "user_space",
      },
    ];
  }

  private async write(
    stage: WorkflowUndoStageId,
    checkpoint: WorkflowStepCheckpoint
  ): Promise<void> {
    const filePath = this.path(stage);
    await mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = createTempPath(filePath);
    try {
      await writeFile(tempPath, `${JSON.stringify(checkpoint, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      await rename(tempPath, filePath);
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}
