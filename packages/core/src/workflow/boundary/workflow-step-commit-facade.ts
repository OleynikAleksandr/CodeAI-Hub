import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolveWorkspaceRuntimeCapsule } from "../runtime/workspace-runtime-capsule";
import {
  untrackWorkspaceRollbackIgnoredRuntimePaths,
  untrackWorkspaceSettingsForRollback,
} from "../runtime/workspace-settings-rollback-ignore";
import type { WorkflowStageId } from "../watcher/watcher-types";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import {
  getWorkflowBoundaryStageLabel,
  type WorkflowBoundaryCommitResult,
} from "./workflow-boundary-model";

export interface WorkflowStepCommitFacadeOptions {
  readonly git?: WorkflowBoundaryGit;
}

export interface WorkflowStepCommitSession {
  readonly providerId: string;
  readonly providerSessionId?: string;
}

export interface WorkflowStepCommitParams {
  readonly sessions?: readonly WorkflowStepCommitSession[];
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface WorkflowStepCommitResult {
  readonly commit: WorkflowBoundaryCommitResult;
  readonly residualDocumentCommit?: WorkflowStepResidualDocumentCommit;
  readonly stage: WorkflowStageId;
}

export interface WorkflowStepResidualDocumentCommit {
  readonly commit: WorkflowBoundaryCommitResult;
  readonly paths: readonly string[];
}

const execFileAsync = promisify(execFile);
const DOCUMENT_EXTENSIONS = new Set([
  ".adoc",
  ".csv",
  ".doc",
  ".docx",
  ".drawio",
  ".md",
  ".mdx",
  ".mmd",
  ".pdf",
  ".plantuml",
  ".puml",
  ".rst",
  ".tsv",
  ".txt",
  ".xls",
  ".xlsx",
]);
const DOCUMENT_ROOTS = new Set(["doc", "docs"]);
const GITIGNORE_PATH = ".gitignore";
const GIT_STATUS_PATH_OFFSET = 3;
const LOCAL_STATE_ROOT = ".codeai-hub/state";
const LOCAL_STATE_IGNORE_PATTERN = ".codeai-hub/state/";
const WORKSPACE_RUNTIME_IGNORE_PATTERN = ".codeai-hub/*/runtime/";
const NEWLINE_RE = /\r?\n/u;
const RENAME_SEPARATOR = " -> ";
const TRAILING_SLASHES_RE = /\/+$/u;

const buildAcceptedStepCommitMessage = (stage: WorkflowStageId): string =>
  `codeai-step: ${getWorkflowBoundaryStageLabel(stage)} accepted`;

const buildResidualDocumentsCommitMessage = (stage: WorkflowStageId): string =>
  `codeai-step: ${getWorkflowBoundaryStageLabel(stage)} residual documents`;

const PRESERVE_COMMIT_MESSAGE = "chore: preserve workspace changes";

const splitGitPath = (value: string): readonly string[] => value.split("/");

const trimTrailingSlash = (value: string): string =>
  value.replace(TRAILING_SLASHES_RE, "");

const extractGitStatusPath = (entry: string): string => {
  const value = entry.slice(GIT_STATUS_PATH_OFFSET).trim();
  return value.includes(RENAME_SEPARATOR)
    ? (value.split(RENAME_SEPARATOR).at(-1) ?? value).trim()
    : value;
};

const isWorkflowNeutralDocumentPath = (value: string): boolean => {
  const normalized = trimTrailingSlash(value);
  const parts = splitGitPath(normalized);
  const root = parts[0] ?? "";
  if (!root || root.startsWith(".")) {
    return false;
  }
  if (DOCUMENT_ROOTS.has(root)) {
    return true;
  }
  if (parts.length === 1 && ["CHANGELOG.md", "README.md"].includes(root)) {
    return true;
  }
  return DOCUMENT_EXTENSIONS.has(pathExtension(normalized));
};

const pathExtension = (value: string): string => {
  const basename = value.split("/").at(-1) ?? "";
  const dotIndex = basename.lastIndexOf(".");
  return dotIndex >= 0 ? basename.slice(dotIndex).toLowerCase() : "";
};

const selectWorkflowNeutralDocumentPaths = (
  dirtyPaths: readonly string[]
): readonly string[] => [
  ...new Set(
    dirtyPaths.map(extractGitStatusPath).filter(isWorkflowNeutralDocumentPath)
  ),
];

const normalizesToIgnorePattern = (line: string, pattern: string): boolean => {
  const normalized = line.trim().replace(TRAILING_SLASHES_RE, "");
  return normalized === pattern.replace(TRAILING_SLASHES_RE, "");
};

const ensureRootGitignorePatterns = async (params: {
  readonly patterns: readonly string[];
  readonly workspaceRoot: string;
}): Promise<void> => {
  const existingContent = await readFile(
    `${params.workspaceRoot}/${GITIGNORE_PATH}`,
    "utf8"
  ).catch(() => "");
  const lines = existingContent.split(NEWLINE_RE);
  const missingPatterns = params.patterns.filter(
    (pattern) => !lines.some((line) => normalizesToIgnorePattern(line, pattern))
  );
  if (missingPatterns.length === 0) {
    return;
  }
  const prefix =
    existingContent.length === 0 || existingContent.endsWith("\n")
      ? existingContent
      : `${existingContent}\n`;
  await writeFile(
    `${params.workspaceRoot}/${GITIGNORE_PATH}`,
    `${prefix}${missingPatterns.join("\n")}\n`,
    "utf8"
  );
};

const untrackLocalStateRuntimePaths = async (
  workspaceRoot: string
): Promise<void> => {
  await execFileAsync(
    "git",
    ["rm", "--cached", "-r", "--ignore-unmatch", "--", LOCAL_STATE_ROOT],
    { cwd: workspaceRoot }
  );
};

const commitWorkflowNeutralResidualDocuments = async (params: {
  readonly dirtyPaths: readonly string[];
  readonly git: WorkflowBoundaryGit;
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
}): Promise<WorkflowStepResidualDocumentCommit | undefined> => {
  const paths = selectWorkflowNeutralDocumentPaths(params.dirtyPaths);
  if (paths.length === 0) {
    return undefined;
  }
  const commit = await params.git.commit({
    commitMessage: buildResidualDocumentsCommitMessage(params.stage),
    paths,
    workspaceRoot: params.workspaceRoot,
  });
  if (commit.noStagedChanges) {
    return undefined;
  }
  return { commit, paths };
};

export class WorkflowStepCommitFacade {
  readonly #git: WorkflowBoundaryGit;

  constructor(options: WorkflowStepCommitFacadeOptions = {}) {
    this.#git = options.git ?? new WorkflowBoundaryGit();
  }

  async commitAcceptedStep(
    params: WorkflowStepCommitParams
  ): Promise<WorkflowStepCommitResult> {
    const capsule = resolveWorkspaceRuntimeCapsule(params);
    await this.#git.ensureRepository(params.workspaceRoot);
    await untrackWorkspaceRollbackIgnoredRuntimePaths({
      capsule,
      workspaceRoot: params.workspaceRoot,
    });
    await untrackWorkspaceSettingsForRollback({
      settingsFile: capsule.settingsFile,
      workspaceRoot: params.workspaceRoot,
    });
    await untrackLocalStateRuntimePaths(params.workspaceRoot);
    await ensureRootGitignorePatterns({
      patterns: [LOCAL_STATE_IGNORE_PATTERN, WORKSPACE_RUNTIME_IGNORE_PATTERN],
      workspaceRoot: params.workspaceRoot,
    });
    const commit = await this.#git.commit({
      allowEmpty: true,
      commitMessage: buildAcceptedStepCommitMessage(params.stage),
      paths: [capsule.workspaceCapsuleRoot.relativePath, GITIGNORE_PATH],
      workspaceRoot: params.workspaceRoot,
    });
    const dirtyPaths = await this.#git.statusPorcelain(params.workspaceRoot);
    const residualDocumentCommit = await commitWorkflowNeutralResidualDocuments(
      {
        dirtyPaths,
        git: this.#git,
        stage: params.stage,
        workspaceRoot: params.workspaceRoot,
      }
    );
    const remainingDirtyPaths = await this.#git.statusPorcelain(
      params.workspaceRoot
    );
    if (remainingDirtyPaths.length > 0) {
      await this.#git.commit({
        commitMessage: PRESERVE_COMMIT_MESSAGE,
        paths: [...new Set(remainingDirtyPaths.map(extractGitStatusPath))],
        workspaceRoot: params.workspaceRoot,
      });
    }
    return {
      commit,
      residualDocumentCommit,
      stage: params.stage,
    };
  }
}
