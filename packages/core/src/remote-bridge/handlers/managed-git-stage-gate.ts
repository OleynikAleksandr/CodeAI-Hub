import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ManagedStageId =
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

export interface ManagedGitStatus {
  readonly clean: boolean;
  readonly dirtyByStage: Readonly<Record<ManagedStageId, readonly string[]>>;
  readonly dirtyFiles: readonly string[];
}

const MANAGED_STAGE_IDS: readonly ManagedStageId[] = [
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
];
const DIAGRAM_MODULES_PLAN_PATH =
  "doc/TODO/stages/diagram-modules/todo-plan.md";
const APPLICATION_SKELETON_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";

export const isManagedStageId = (value: string): value is ManagedStageId =>
  MANAGED_STAGE_IDS.includes(value as ManagedStageId);

const isVolatileCoreMetadataPath = (
  file: string,
  workspaceSlug: string
): boolean =>
  file.startsWith(".codeai-hub/state/") ||
  file.startsWith("node_modules/") ||
  file === `.codeai-hub/${workspaceSlug}/description/description-step.json`;

const parseGitStatusPath = (line: string): string | null => {
  const rawPath = line.slice(3).trim();
  if (!rawPath) {
    return null;
  }
  const renamedPath = rawPath.includes(" -> ")
    ? rawPath.split(" -> ").at(-1)?.trim()
    : rawPath;
  return renamedPath?.replace(/^"|"$/g, "") ?? null;
};

export const readManagedGitStatus = async (
  workspaceRoot: string,
  workspaceSlug: string
): Promise<ManagedGitStatus> => {
  const { stdout } = await execFileAsync(
    "git",
    ["status", "--short", "--untracked-files=all"],
    { cwd: workspaceRoot }
  ).catch(() => ({ stdout: "" }));
  const dirtyFiles = stdout
    .split("\n")
    .map((line) => parseGitStatusPath(line))
    .filter((entry): entry is string => Boolean(entry))
    .filter((file) => !isVolatileCoreMetadataPath(file, workspaceSlug));
  const dirtyByStage: Record<ManagedStageId, string[]> = {
    diagram_modules: [],
    application_skeleton: [],
    quality_gates: [],
  };
  for (const file of dirtyFiles) {
    if (
      file.startsWith(`.codeai-hub/${workspaceSlug}/application_skeleton/`) ||
      file.startsWith(
        `.codeai-hub/${workspaceSlug}/workflow/revisions/application-skeleton/`
      ) ||
      file === APPLICATION_SKELETON_PLAN_PATH ||
      file.startsWith("product-parts/")
    ) {
      dirtyByStage.application_skeleton.push(file);
    } else if (
      file.startsWith(`.codeai-hub/${workspaceSlug}/diagram_modules/`) ||
      file.startsWith(`.codeai-hub/${workspaceSlug}/workflow/`) ||
      file === DIAGRAM_MODULES_PLAN_PATH
    ) {
      dirtyByStage.diagram_modules.push(file);
    } else if (
      file.startsWith(`.codeai-hub/${workspaceSlug}/quality_gates/`) ||
      file.startsWith("scripts/gates/") ||
      file.startsWith("scripts/quality-gates/") ||
      file === ".husky/pre-commit" ||
      file === ".husky/pre-push" ||
      file === "biome.jsonc" ||
      file === QUALITY_GATES_PLAN_PATH ||
      file === WORKSPACE_PLAN_PATH ||
      file === "package.json" ||
      file === "package-lock.json"
    ) {
      dirtyByStage.quality_gates.push(file);
    }
  }
  return { clean: dirtyFiles.length === 0, dirtyByStage, dirtyFiles };
};

export const listDirtyFilesOutsideManagedStage = (
  status: ManagedGitStatus,
  stage: ManagedStageId
): readonly string[] => {
  const allowed = new Set(status.dirtyByStage[stage]);
  return status.dirtyFiles.filter((file) => !allowed.has(file));
};

const formatDirtyGateError = (
  stageTitle: string,
  files: readonly string[]
): string =>
  `Core has not yet finalized the managed commit for ${stageTitle}-owned files: ${files.join(", ")}. Core owns this commit gate; respond with a content-readiness note once the artifacts are ready.`;

export const attachManagedGitStatus = <T extends object>(
  progress: T | null,
  files: readonly string[]
): T | null =>
  progress && files.length > 0
    ? ({ ...progress, aggregateReady: false, managedGitDirtyFiles: files } as T)
    : progress;

export const attachValidationDirtyGate = <
  T extends {
    readonly substep: string;
    readonly validationErrors: readonly string[];
  },
>(
  progress: T | null,
  stageTitle: string,
  files: readonly string[]
): T | null =>
  progress && files.length > 0
    ? ({
        ...progress,
        substep: "failed",
        validationErrors: [
          ...progress.validationErrors,
          formatDirtyGateError(stageTitle, files),
        ],
      } as T)
    : progress;
