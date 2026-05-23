import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  type WorkflowStepUndoEntryInput,
  WorkflowStepUndoLedgerStore,
  type WorkflowUndoRoot,
  type WorkflowUndoStageId,
} from "./workflow-step-undo-ledger";

type SnapshotEntry =
  | { readonly kind: "directory"; readonly relativePath: string }
  | {
      readonly content: string;
      readonly kind: "file";
      readonly relativePath: string;
    };

interface SnapshotRoot {
  readonly absolutePath: string;
  readonly relativeBase: string;
  readonly root: WorkflowUndoRoot;
}

export interface WorkflowMutationJournalCaptureOptions {
  readonly source: string;
  readonly stage: WorkflowUndoStageId;
  readonly userSpaceRoot?: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const ROOT_DIR = ".codeai-hub";
const USER_SPACE_ROOT_DIR = ".codeai-hub";
const LEDGER_RELATIVE_PATH_RE =
  /^\.codeai-hub\/[^/]+\/workflow\/undo-ledger\.json$/u;
const QUESTIONNAIRE_RELATIVE_PATH_RE =
  /^\.codeai-hub\/[^/]+\/description\/questionnaire\.md$/u;
const IGNORED_BASENAMES = new Set([".DS_Store"]);
const STAGE_TODO_DIRS = new Map<string, string>([
  ["description", "description"],
  ["virtual_simulation", "virtual-simulation"],
  ["diagram_modules", "diagram-modules"],
  ["application_skeleton", "application-skeleton"],
  ["quality_gates", "quality-gates"],
]);

const normalizeRelativePath = (value: string): string =>
  value.split(path.sep).join("/");

const safeRoot = (
  absolutePath: string,
  relativeBase: string
): SnapshotRoot => ({
  absolutePath,
  relativeBase,
  root: "workspace",
});

const userRoot = (
  absolutePath: string,
  relativeBase: string
): SnapshotRoot => ({
  absolutePath,
  relativeBase,
  root: "user_space",
});

const shouldIgnoreRelativePath = (relativePath: string): boolean =>
  LEDGER_RELATIVE_PATH_RE.test(relativePath) ||
  QUESTIONNAIRE_RELATIVE_PATH_RE.test(relativePath) ||
  relativePath.split("/").some((segment) => IGNORED_BASENAMES.has(segment));

const isDevelopmentTreeStage = (stage: WorkflowUndoStageId): boolean =>
  stage.startsWith("development_tree/");

const stagePathSegment = (stage: WorkflowUndoStageId): string | null =>
  isDevelopmentTreeStage(stage) ? stage : stage;

const resolveSnapshotRoots = (
  options: WorkflowMutationJournalCaptureOptions
): readonly SnapshotRoot[] => {
  const roots: SnapshotRoot[] = [];
  const hubRoot = path.join(
    options.workspaceRoot,
    ROOT_DIR,
    options.workspaceSlug
  );
  const stageSegment = stagePathSegment(options.stage);
  if (stageSegment) {
    roots.push(
      safeRoot(
        path.join(hubRoot, stageSegment),
        `${ROOT_DIR}/${options.workspaceSlug}/${stageSegment}`
      )
    );
  }
  roots.push(
    safeRoot(
      path.join(hubRoot, "continuity"),
      `${ROOT_DIR}/${options.workspaceSlug}/continuity`
    ),
    safeRoot(
      path.join(hubRoot, "workflow"),
      `${ROOT_DIR}/${options.workspaceSlug}/workflow`
    )
  );
  const todoDir = STAGE_TODO_DIRS.get(options.stage);
  if (todoDir) {
    roots.push(
      safeRoot(
        path.join(options.workspaceRoot, "doc", "TODO", "stages", todoDir),
        `doc/TODO/stages/${todoDir}`
      )
    );
  }
  if (isDevelopmentTreeStage(options.stage)) {
    roots.push(
      safeRoot(
        path.join(
          options.workspaceRoot,
          "doc",
          "TODO",
          "stages",
          "development-tree"
        ),
        "doc/TODO/stages/development-tree"
      )
    );
  }
  const userSpaceRoot =
    options.userSpaceRoot ?? path.join(homedir(), USER_SPACE_ROOT_DIR);
  roots.push(
    userRoot(
      path.join(userSpaceRoot, "sessions", options.workspaceSlug),
      `sessions/${options.workspaceSlug}`
    )
  );
  return roots;
};

const readSnapshotEntry = async (
  root: SnapshotRoot,
  absolutePath: string
): Promise<SnapshotEntry | null> => {
  const relativePath = normalizeRelativePath(
    path.join(root.relativeBase, path.relative(root.absolutePath, absolutePath))
  );
  if (shouldIgnoreRelativePath(relativePath)) {
    return null;
  }
  const stats = await stat(absolutePath).catch(() => null);
  if (!stats) {
    return null;
  }
  if (stats.isDirectory()) {
    return { kind: "directory", relativePath };
  }
  if (!stats.isFile()) {
    return null;
  }
  return {
    kind: "file",
    relativePath,
    content: await readFile(absolutePath, "utf8").catch(() => ""),
  };
};

const collectSnapshotRoot = async (
  root: SnapshotRoot,
  entries: Map<string, SnapshotEntry & { readonly root: WorkflowUndoRoot }>
): Promise<void> => {
  const rootStats = await stat(root.absolutePath).catch(() => null);
  if (!rootStats) {
    return;
  }
  const stack = [root.absolutePath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const entry = await readSnapshotEntry(root, current);
    if (entry) {
      entries.set(`${root.root}:${entry.relativePath}`, {
        ...entry,
        root: root.root,
      });
    }
    const currentStats = await stat(current).catch(() => null);
    if (!currentStats?.isDirectory()) {
      continue;
    }
    const children = await readdir(current).catch(() => []);
    for (const child of children) {
      stack.push(path.join(current, child));
    }
  }
};

const collectSnapshot = async (
  roots: readonly SnapshotRoot[]
): Promise<
  Map<string, SnapshotEntry & { readonly root: WorkflowUndoRoot }>
> => {
  const entries = new Map<
    string,
    SnapshotEntry & { readonly root: WorkflowUndoRoot }
  >();
  for (const root of roots) {
    await collectSnapshotRoot(root, entries);
  }
  return entries;
};

const resolveDiffEntries = (params: {
  readonly after: Map<
    string,
    SnapshotEntry & { readonly root: WorkflowUndoRoot }
  >;
  readonly before: Map<
    string,
    SnapshotEntry & { readonly root: WorkflowUndoRoot }
  >;
  readonly source: string;
  readonly stage: WorkflowUndoStageId;
}): WorkflowStepUndoEntryInput[] => {
  const entries: WorkflowStepUndoEntryInput[] = [];
  for (const [key, afterEntry] of params.after) {
    const beforeEntry = params.before.get(key);
    if (!beforeEntry) {
      entries.push({
        kind:
          afterEntry.kind === "directory" ? "create_directory" : "write_file",
        relativePath: afterEntry.relativePath,
        root: afterEntry.root,
        source: params.source,
        stage: params.stage,
      });
      continue;
    }
    if (
      afterEntry.kind === "file" &&
      beforeEntry.kind === "file" &&
      afterEntry.content !== beforeEntry.content
    ) {
      entries.push({
        kind: "write_file",
        previousContent: beforeEntry.content,
        relativePath: afterEntry.relativePath,
        root: afterEntry.root,
        source: params.source,
        stage: params.stage,
        undoBehavior: "restore_previous",
      });
    }
  }
  for (const [key, beforeEntry] of params.before) {
    if (params.after.has(key) || beforeEntry.kind !== "file") {
      continue;
    }
    entries.push({
      kind: "write_file",
      previousContent: beforeEntry.content,
      relativePath: beforeEntry.relativePath,
      root: beforeEntry.root,
      source: params.source,
      stage: params.stage,
      undoBehavior: "restore_previous",
    });
  }
  return entries;
};

export const captureWorkflowMutation = async <T>(
  options: WorkflowMutationJournalCaptureOptions,
  action: () => Promise<T>
): Promise<T> => {
  const roots = resolveSnapshotRoots(options);
  const before = await collectSnapshot(roots);
  const result = await action();
  const after = await collectSnapshot(roots);
  const entries = resolveDiffEntries({
    after,
    before,
    source: options.source,
    stage: options.stage,
  });
  if (entries.length > 0) {
    await new WorkflowStepUndoLedgerStore({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    }).append(entries);
  }
  return result;
};
