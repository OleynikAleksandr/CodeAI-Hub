import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorkflowStageId } from "../watcher/watcher-types";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import {
  getWorkflowBoundaryStageLabel,
  type WorkflowBoundaryCommitResult,
} from "./workflow-boundary-model";
import {
  captureWorkflowRuntimeSlices,
  type WorkflowRuntimeSliceSession,
} from "./workflow-runtime-slice-snapshot";

const GITIGNORE_PATH = ".gitignore";
const LOCAL_STATE_IGNORE_PATTERN = ".codeai-hub/state/";
const NEWLINE_RE = /\r?\n/u;
const TRAILING_SLASHES_RE = /\/+$/u;

export interface WorkflowStepCommitFacadeOptions {
  readonly git?: WorkflowBoundaryGit;
}

export interface WorkflowStepCommitParams {
  readonly sessions?: readonly WorkflowRuntimeSliceSession[];
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface WorkflowStepCommitResult {
  readonly commit: WorkflowBoundaryCommitResult;
  readonly runtimeSliceCount: number;
  readonly stage: WorkflowStageId;
}

const normalizesToLocalStateIgnore = (line: string): boolean => {
  const normalized = line.trim().replace(TRAILING_SLASHES_RE, "");
  return normalized === ".codeai-hub/state";
};

const ensureLocalStateIgnored = async (
  workspaceRoot: string
): Promise<void> => {
  const gitignorePath = path.join(workspaceRoot, GITIGNORE_PATH);
  const existingContent = await readFile(gitignorePath, "utf8").catch(() => "");
  if (existingContent.split(NEWLINE_RE).some(normalizesToLocalStateIgnore)) {
    return;
  }
  const prefix =
    existingContent.length === 0 || existingContent.endsWith("\n")
      ? existingContent
      : `${existingContent}\n`;
  await writeFile(
    gitignorePath,
    `${prefix}${LOCAL_STATE_IGNORE_PATTERN}\n`,
    "utf8"
  );
};

const buildAcceptedStepCommitMessage = (stage: WorkflowStageId): string =>
  `codeai-step: ${getWorkflowBoundaryStageLabel(stage)} accepted`;

const formatDirtyTreeError = (paths: readonly string[]): string =>
  [
    "Workflow step accepted, but Git is still dirty after the Core commit.",
    "The next workflow step cannot start until these paths are classified, committed, or ignored:",
    ...paths.map((value) => `- ${value}`),
  ].join("\n");

export class WorkflowStepCommitFacade {
  readonly #git: WorkflowBoundaryGit;

  constructor(options: WorkflowStepCommitFacadeOptions = {}) {
    this.#git = options.git ?? new WorkflowBoundaryGit();
  }

  async commitAcceptedStep(
    params: WorkflowStepCommitParams
  ): Promise<WorkflowStepCommitResult> {
    await ensureLocalStateIgnored(params.workspaceRoot);
    const manifest = await captureWorkflowRuntimeSlices(params);
    const commit = await this.#git.commit({
      allowEmpty: true,
      commitMessage: buildAcceptedStepCommitMessage(params.stage),
      paths: [GITIGNORE_PATH, path.join(".codeai-hub", params.workspaceSlug)],
      workspaceRoot: params.workspaceRoot,
    });
    const dirtyPaths = await this.#git.statusPorcelain(params.workspaceRoot);
    if (dirtyPaths.length > 0) {
      throw new Error(formatDirtyTreeError(dirtyPaths));
    }
    return {
      commit,
      runtimeSliceCount: manifest.entries.length,
      stage: params.stage,
    };
  }
}
