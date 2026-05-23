import { rm } from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { WorkflowStepCheckpointFacade } from "../../workflow/step-checkpoint/workflow-step-checkpoint-facade";
import {
  undoWorkflowStepAction,
  type WorkflowStepUndoAction,
  type WorkflowStepUndoEntry,
  WorkflowStepUndoLedgerStore,
} from "../../workflow/undo/workflow-step-undo-ledger";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import {
  cleanupDescriptionState,
  pruneContinuityIndex,
} from "./workflow-step-clear-continuity-support";
import { collectWorkflowStepSessionCleanupPaths } from "./workflow-step-clear-session-cleanup";

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const WORKFLOW_STAGES = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];
const STAGE_TODO_DIRS: Record<WorkflowStageId, string> = {
  application_skeleton: "application-skeleton",
  description: "description",
  diagram_modules: "diagram-modules",
  quality_gates: "quality-gates",
  virtual_simulation: "virtual-simulation",
};
const WORKSPACE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

type ClearTarget =
  | { readonly kind: "workflow_stage"; readonly stage: WorkflowStageId }
  | {
      readonly kind: "development_tree_node";
      readonly codeWorkspacePath?: string | null;
      readonly workflowPath: string;
    };
type WorkflowStageClearRequest = ParsedClearRequest & {
  readonly target: Extract<ClearTarget, { readonly kind: "workflow_stage" }>;
};
type DevelopmentTreeClearRequest = ParsedClearRequest & {
  readonly target: Extract<
    ClearTarget,
    { readonly kind: "development_tree_node" }
  >;
};

export interface WorkflowStepClearDeps {
  readonly logger: Logger;
  readonly resetWorkflowState: (workspaceSlug: string) => void;
  readonly sessionManager: SessionManager;
}

interface ParsedClearRequest {
  readonly target: ClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isWorkflowStageId = (value: string): value is WorkflowStageId =>
  WORKFLOW_STAGES.includes(value as WorkflowStageId);

const isSafeWorkspaceSlug = (value: string): boolean =>
  WORKSPACE_SLUG_RE.test(value);

const isSafeRelativePath = (value: string): boolean => {
  const normalized = path.posix.normalize(value.replace(/\\/gu, "/"));
  return (
    normalized === value &&
    !normalized.startsWith("../") &&
    !path.isAbsolute(normalized)
  );
};

const safeJoin = (root: string, relativePath: string): string | null => {
  if (!isSafeRelativePath(relativePath)) {
    return null;
  }
  const resolved = path.resolve(root, relativePath);
  const rootWithSep = `${path.resolve(root)}${path.sep}`;
  return resolved === path.resolve(root) || resolved.startsWith(rootWithSep)
    ? resolved
    : null;
};

const parseTarget = (value: unknown): ClearTarget | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.kind === "workflow_stage") {
    const stage = readString(record.stage);
    return stage && isWorkflowStageId(stage)
      ? { kind: "workflow_stage", stage }
      : null;
  }
  if (record.kind !== "development_tree_node") {
    return null;
  }
  const workflowPath = readString(record.workflowPath);
  if (
    !(
      workflowPath?.startsWith("development_tree/") &&
      isSafeRelativePath(workflowPath)
    )
  ) {
    return null;
  }
  return {
    kind: "development_tree_node",
    workflowPath,
    codeWorkspacePath: readString(record.codeWorkspacePath),
  };
};

const parseClearRequest = (body: unknown): ParsedClearRequest | null => {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as Record<string, unknown>;
  const workspacePath = readString(record.workspacePath);
  const workspaceSlug = readString(record.workspaceSlug);
  const target = parseTarget(record.target);
  if (
    !(
      workspacePath &&
      path.isAbsolute(workspacePath) &&
      workspaceSlug &&
      isSafeWorkspaceSlug(workspaceSlug) &&
      target
    )
  ) {
    return null;
  }
  return { workspacePath, workspaceSlug, target };
};

const downstreamStages = (
  stage: WorkflowStageId
): readonly WorkflowStageId[] => {
  const index = WORKFLOW_STAGES.indexOf(stage);
  return index < 0 ? [] : WORKFLOW_STAGES.slice(index);
};

const removePath = async (
  absolutePath: string,
  removed: string[]
): Promise<void> => {
  await rm(absolutePath, { force: true, recursive: true });
  removed.push(absolutePath);
};

const developmentTreeTodoPath = (workflowPath: string): string | null => {
  const prefix = "development_tree/materialized/";
  if (!workflowPath.startsWith(prefix)) {
    return null;
  }
  return path.posix.join(
    "doc/TODO/stages/development-tree",
    workflowPath.slice(prefix.length)
  );
};

const isStageDownstream = (
  candidate: string | null,
  target: WorkflowStageId
): boolean =>
  Boolean(
    candidate && downstreamStages(target).includes(candidate as WorkflowStageId)
  );

const isStageInScope = (stage: string | null, target: ClearTarget): boolean =>
  target.kind === "workflow_stage"
    ? isStageDownstream(stage, target.stage)
    : Boolean(stage?.startsWith(target.workflowPath));

const clearMatchingSessions = (params: {
  readonly sessionManager: SessionManager;
  readonly target: ClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): number => {
  let deletedCount = 0;
  for (const session of params.sessionManager.listSessions()) {
    if (
      session.workspacePath !== params.workspacePath ||
      session.initiativeSlug !== params.workspaceSlug
    ) {
      continue;
    }
    const shouldDelete = isStageInScope(session.stage, params.target);
    if (shouldDelete && params.sessionManager.deleteSession(session.id)) {
      deletedCount += 1;
    }
  }
  return deletedCount;
};

const collectLegacyDescriptionGeneratedPaths = (
  params: WorkflowStageClearRequest
): string[] => {
  const baseRelativePaths = [
    `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`,
    `.codeai-hub/${params.workspaceSlug}/description/Description_Draft.md`,
  ];
  return baseRelativePaths
    .map((relativePath) => safeJoin(params.workspacePath, relativePath))
    .filter((value): value is string => value !== null);
};

const collectStagePaths = (params: WorkflowStageClearRequest): string[] => {
  const paths: string[] = [];
  const hubRoot = path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug
  );
  for (const stage of downstreamStages(params.target.stage)) {
    if (stage === "description") {
      paths.push(...collectLegacyDescriptionGeneratedPaths(params));
    } else {
      paths.push(path.join(hubRoot, stage));
    }
    paths.push(path.join(hubRoot, "continuity", stage));
    paths.push(
      path.join(params.workspacePath, "doc/TODO/stages", STAGE_TODO_DIRS[stage])
    );
  }
  paths.push(path.join(hubRoot, "workflow", "state.json"));
  if (downstreamStages(params.target.stage).includes("application_skeleton")) {
    paths.push(path.join(params.workspacePath, "product-parts"));
  }
  if (downstreamStages(params.target.stage).includes("diagram_modules")) {
    paths.push(path.join(hubRoot, "development_tree"));
    paths.push(path.join(hubRoot, "continuity", "development_tree"));
    paths.push(
      path.join(params.workspacePath, "doc/TODO/stages/development-tree")
    );
  }
  return paths;
};

const isUndoEntryInScope = (
  entry: WorkflowStepUndoEntry,
  target: ClearTarget
): boolean => isStageInScope(entry.stage, target);

const collectLedgerUndoActions = async (params: {
  readonly ledgerStore: WorkflowStepUndoLedgerStore;
  readonly target: ClearTarget;
}): Promise<WorkflowStepUndoAction[]> => {
  const ledger = await params.ledgerStore.read();
  if (!ledger) {
    return [];
  }
  return ledger.entries
    .filter((entry) => isUndoEntryInScope(entry, params.target))
    .slice()
    .reverse()
    .flatMap((entry) => {
      const absolutePath = params.ledgerStore.resolveEntryPath(entry);
      return absolutePath ? [{ absolutePath, entry }] : [];
    });
};

const collectDevelopmentTreePaths = (
  params: DevelopmentTreeClearRequest
): string[] => {
  const target = params.target;
  const paths: string[] = [];
  const artifactPath = safeJoin(
    path.join(params.workspacePath, ".codeai-hub", params.workspaceSlug),
    target.workflowPath
  );
  const continuityPath = safeJoin(
    path.join(
      params.workspacePath,
      ".codeai-hub",
      params.workspaceSlug,
      "continuity"
    ),
    target.workflowPath
  );
  const todoPath = developmentTreeTodoPath(target.workflowPath);
  if (artifactPath) {
    paths.push(artifactPath);
  }
  if (continuityPath) {
    paths.push(continuityPath);
  }
  if (todoPath) {
    const resolvedTodoPath = safeJoin(params.workspacePath, todoPath);
    if (resolvedTodoPath) {
      paths.push(resolvedTodoPath);
    }
  }
  if (target.codeWorkspacePath) {
    const codePath = safeJoin(params.workspacePath, target.codeWorkspacePath);
    if (codePath) {
      paths.push(codePath);
    }
  }
  return paths;
};

const collectClearPaths = (
  parsed: ParsedClearRequest,
  ledgerActions: readonly WorkflowStepUndoAction[]
): string[] => {
  const fallbackPaths =
    parsed.target.kind === "workflow_stage"
      ? collectStagePaths({ ...parsed, target: parsed.target })
      : collectDevelopmentTreePaths({ ...parsed, target: parsed.target });
  if (ledgerActions.length === 0) {
    return fallbackPaths;
  }
  const ledgerPaths = new Set(
    ledgerActions.map((ledgerAction) => ledgerAction.absolutePath)
  );
  return fallbackPaths.filter((targetPath) => !ledgerPaths.has(targetPath));
};

const restoreWorkflowStageCheckpoint = async (
  parsed: ParsedClearRequest
): Promise<boolean> => {
  if (parsed.target.kind !== "workflow_stage") {
    return false;
  }
  return await new WorkflowStepCheckpointFacade().restoreCheckpoint({
    stage: parsed.target.stage,
    workspaceRoot: parsed.workspacePath,
    workspaceSlug: parsed.workspaceSlug,
  });
};

export const handleWorkflowStepClear = async (
  req: Request,
  res: Response,
  deps: WorkflowStepClearDeps
): Promise<void> => {
  const parsed = parseClearRequest(req.body);
  if (!parsed) {
    res
      .status(HTTP_BAD_REQUEST)
      .json({ error: "Invalid workflow clear request" });
    return;
  }
  const removedPaths: string[] = [];
  const restoredPaths: string[] = [];
  try {
    const sessionCleanupPaths =
      await collectWorkflowStepSessionCleanupPaths(parsed);
    const checkpointRestored = await restoreWorkflowStageCheckpoint(parsed);
    if (!checkpointRestored) {
      const ledgerStore = new WorkflowStepUndoLedgerStore({
        workspaceRoot: parsed.workspacePath,
        workspaceSlug: parsed.workspaceSlug,
      });
      const ledgerActions = await collectLedgerUndoActions({
        ledgerStore,
        target: parsed.target,
      });
      const paths = collectClearPaths(parsed, ledgerActions);
      for (const ledgerAction of ledgerActions) {
        await undoWorkflowStepAction(ledgerAction, removedPaths, restoredPaths);
      }
      for (const targetPath of paths) {
        await removePath(targetPath, removedPaths);
      }
      if (
        parsed.target.kind === "workflow_stage" &&
        downstreamStages(parsed.target.stage).includes("description")
      ) {
        await cleanupDescriptionState(parsed);
      }
      await pruneContinuityIndex({
        workspacePath: parsed.workspacePath,
        workspaceSlug: parsed.workspaceSlug,
        isStageInScope: (stage) => isStageInScope(stage, parsed.target),
      });
      await ledgerStore.prune(
        (entry) =>
          !isUndoEntryInScope(entry, parsed.target) ||
          entry.undoBehavior === "preserve_path"
      );
    }
    for (const targetPath of sessionCleanupPaths) {
      await removePath(targetPath, removedPaths);
    }
    const deletedSessions = clearMatchingSessions({
      sessionManager: deps.sessionManager,
      target: parsed.target,
      workspacePath: parsed.workspacePath,
      workspaceSlug: parsed.workspaceSlug,
    });
    deps.resetWorkflowState(parsed.workspaceSlug);
    res.json({
      checkpointRestored,
      deletedSessions,
      removedPaths,
      restoredPaths,
    });
  } catch (error) {
    deps.logger.warn("Failed to clear workflow step", {
      error: error instanceof Error ? error.message : String(error),
      workspaceSlug: parsed.workspaceSlug,
    });
    res
      .status(HTTP_INTERNAL_ERROR)
      .json({ error: "Unable to clear workflow step" });
  }
};
