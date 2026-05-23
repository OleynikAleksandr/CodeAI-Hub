import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { WorkflowStageId } from "../watcher/watcher-types";

const LEDGER_FILE_NAME = "undo-ledger.json";
const ROOT_DIR = ".codeai-hub";
const WORKFLOW_DIR = "workflow";
const TEMP_FILE_SUFFIX = ".tmp";

export type WorkflowUndoEntryKind = "create_directory" | "write_file";
export type WorkflowUndoBehavior =
  | "delete_path"
  | "preserve_path"
  | "restore_previous";
export type WorkflowUndoStageId =
  | WorkflowStageId
  | `development_tree/${string}`;
export type WorkflowUndoRoot = "workspace" | "user_space";

export interface WorkflowStepUndoEntry {
  readonly id: string;
  readonly kind: WorkflowUndoEntryKind;
  readonly previousContent?: string | null;
  readonly relativePath: string;
  readonly root?: WorkflowUndoRoot;
  readonly source: string;
  readonly stage: WorkflowUndoStageId;
  readonly timestamp: string;
  readonly undoBehavior?: WorkflowUndoBehavior;
}

export interface WorkflowStepUndoLedger {
  readonly entries: readonly WorkflowStepUndoEntry[];
  readonly updatedAt: string;
  readonly version: 1;
  readonly workspaceSlug: string;
}

export interface WorkflowStepUndoAction {
  readonly absolutePath: string;
  readonly entry: WorkflowStepUndoEntry;
}

export interface WorkflowStepUndoEntryInput {
  readonly kind: WorkflowUndoEntryKind;
  readonly previousContent?: string | null;
  readonly relativePath: string;
  readonly root?: WorkflowUndoRoot;
  readonly source: string;
  readonly stage: WorkflowUndoStageId;
  readonly undoBehavior?: WorkflowUndoBehavior;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readNullableString = (value: unknown): string | null | undefined => {
  if (value === null) {
    return null;
  }
  return typeof value === "string" ? value : undefined;
};

const readUndoBehavior = (value: unknown): WorkflowUndoBehavior | undefined =>
  value === "delete_path" ||
  value === "preserve_path" ||
  value === "restore_previous"
    ? value
    : undefined;

const readUndoRoot = (value: unknown): WorkflowUndoRoot | undefined =>
  value === "workspace" || value === "user_space" ? value : undefined;

const isSafeRelativePath = (value: string): boolean => {
  const normalized = path.posix.normalize(value.replace(/\\/gu, "/"));
  return (
    normalized === value &&
    !normalized.startsWith("../") &&
    !path.posix.isAbsolute(normalized)
  );
};

const normalizeRelativePath = (value: string): string | null => {
  const normalized = value.replace(/\\/gu, "/").trim();
  return normalized && isSafeRelativePath(normalized) ? normalized : null;
};

const createEntryId = (timestamp: string, index: number): string =>
  `${timestamp.replace(/[^\d]/gu, "")}-${index}-${Math.random()
    .toString(36)
    .slice(2)}`;

const parseEntry = (value: unknown): WorkflowStepUndoEntry | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value.id);
  const kind = readString(value.kind);
  const relativePath = readString(value.relativePath);
  const source = readString(value.source);
  const stage = readString(value.stage);
  const timestamp = readString(value.timestamp);
  const previousContent = readNullableString(value.previousContent);
  const undoBehavior = readUndoBehavior(value.undoBehavior);
  const root = readUndoRoot(value.root);
  if (
    !(
      id &&
      (kind === "create_directory" || kind === "write_file") &&
      relativePath &&
      normalizeRelativePath(relativePath) &&
      source &&
      stage &&
      timestamp
    )
  ) {
    return null;
  }
  return {
    id,
    kind,
    previousContent,
    relativePath,
    root,
    source,
    stage: stage as WorkflowUndoStageId,
    timestamp,
    undoBehavior,
  };
};

const parseLedger = (
  value: unknown,
  workspaceSlug: string
): WorkflowStepUndoLedger | null => {
  if (!isRecord(value) || value.version !== 1) {
    return null;
  }
  const persistedWorkspaceSlug = readString(value.workspaceSlug);
  const updatedAt = readString(value.updatedAt);
  if (!(persistedWorkspaceSlug === workspaceSlug && updatedAt)) {
    return null;
  }
  const entries = Array.isArray(value.entries)
    ? value.entries.map(parseEntry).filter((entry) => entry !== null)
    : [];
  return { version: 1, workspaceSlug, updatedAt, entries };
};

const createTempPath = (filePath: string): string =>
  path.join(
    path.dirname(filePath),
    `${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}${TEMP_FILE_SUFFIX}`
  );

export const undoWorkflowStepAction = async (
  action: WorkflowStepUndoAction,
  removedPaths: string[],
  restoredPaths: string[]
): Promise<void> => {
  if (action.entry.undoBehavior === "preserve_path") {
    return;
  }
  if (
    action.entry.kind === "write_file" &&
    typeof action.entry.previousContent === "string"
  ) {
    await mkdir(path.dirname(action.absolutePath), { recursive: true });
    await writeFile(action.absolutePath, action.entry.previousContent, "utf8");
    restoredPaths.push(action.absolutePath);
    return;
  }
  if (action.entry.kind === "create_directory") {
    await rm(action.absolutePath, { force: true, recursive: false }).catch(
      (error: unknown) => {
        const code =
          typeof error === "object" && error !== null
            ? (error as { code?: string }).code
            : null;
        if (code !== "ENOTEMPTY" && code !== "EEXIST") {
          throw error;
        }
      }
    );
    removedPaths.push(action.absolutePath);
    return;
  }
  await rm(action.absolutePath, { force: true, recursive: true });
  removedPaths.push(action.absolutePath);
};

export class WorkflowStepUndoLedgerStore {
  private readonly clock: () => string;
  private readonly workspaceRoot: string;
  private readonly workspaceSlug: string;

  constructor(options: {
    readonly clock?: () => string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }) {
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.workspaceRoot = path.resolve(options.workspaceRoot);
    this.workspaceSlug = options.workspaceSlug;
  }

  async append(
    entries: readonly WorkflowStepUndoEntryInput[]
  ): Promise<WorkflowStepUndoLedger> {
    const current = (await this.read()) ?? this.emptyLedger();
    const timestamp = this.clock();
    const nextEntries = [
      ...current.entries,
      ...entries
        .map((entry) => ({
          ...entry,
          relativePath: normalizeRelativePath(entry.relativePath),
        }))
        .filter(
          (entry): entry is WorkflowStepUndoEntryInput =>
            entry.relativePath !== null
        )
        .map((entry, index) => ({
          ...entry,
          id: createEntryId(timestamp, index),
          timestamp,
        })),
    ];
    return await this.write({
      ...current,
      updatedAt: timestamp,
      entries: nextEntries,
    });
  }

  path(): string {
    return path.join(
      this.workspaceRoot,
      ROOT_DIR,
      this.workspaceSlug,
      WORKFLOW_DIR,
      LEDGER_FILE_NAME
    );
  }

  async prune(
    keepEntry: (entry: WorkflowStepUndoEntry) => boolean
  ): Promise<WorkflowStepUndoLedger | null> {
    const current = await this.read();
    if (!current) {
      return null;
    }
    const next = {
      ...current,
      updatedAt: this.clock(),
      entries: current.entries.filter(keepEntry),
    };
    return await this.write(next);
  }

  async read(): Promise<WorkflowStepUndoLedger | null> {
    try {
      const content = await readFile(this.path(), "utf8");
      return parseLedger(JSON.parse(content) as unknown, this.workspaceSlug);
    } catch {
      return null;
    }
  }

  resolveEntryPath(entry: WorkflowStepUndoEntry): string | null {
    const relativePath = normalizeRelativePath(entry.relativePath);
    if (!relativePath) {
      return null;
    }
    const root =
      entry.root === "user_space"
        ? path.join(homedir(), ROOT_DIR)
        : this.workspaceRoot;
    const absolutePath = path.resolve(root, relativePath);
    return absolutePath === root ||
      absolutePath.startsWith(`${root}${path.sep}`)
      ? absolutePath
      : null;
  }

  private emptyLedger(): WorkflowStepUndoLedger {
    return {
      version: 1,
      workspaceSlug: this.workspaceSlug,
      updatedAt: this.clock(),
      entries: [],
    };
  }

  private async write(
    ledger: WorkflowStepUndoLedger
  ): Promise<WorkflowStepUndoLedger> {
    const filePath = this.path();
    await mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = createTempPath(filePath);
    try {
      await writeFile(tempPath, `${JSON.stringify(ledger, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      await rename(tempPath, filePath);
      return ledger;
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}
