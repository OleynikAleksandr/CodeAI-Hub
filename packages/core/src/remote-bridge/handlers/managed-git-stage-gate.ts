import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
const QUALITY_GATES_ARTIFACT_PATH = "quality_gates/quality-gates.json";
const QUALITY_GATES_PATH_KEYS = new Set([
  "integratedPaths",
  "plannedIntegrationPaths",
  "integrationPaths",
  "plannedPaths",
]);
const QG_TSCONFIG_RE = /^tsconfig\.qg(?:\.[a-z0-9-]+)?\.json$/u;
const PATH_SEGMENT_SEPARATOR_RE = /[\\/]+/u;

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

const parseJsonObject = (content: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(content) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const isSafeRelativeWorkspacePath = (value: string): boolean =>
  value.length > 0 &&
  !path.isAbsolute(value) &&
  !value.split(PATH_SEGMENT_SEPARATOR_RE).includes("..") &&
  !value.startsWith("node_modules/");

const collectQualityGatesPathValues = (
  value: unknown,
  paths: Set<string>
): void => {
  if (!(typeof value === "object" && value !== null)) {
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectQualityGatesPathValues(entry, paths);
    }
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (QUALITY_GATES_PATH_KEYS.has(key) && Array.isArray(entry)) {
      for (const pathValue of entry) {
        if (
          typeof pathValue === "string" &&
          isSafeRelativeWorkspacePath(pathValue)
        ) {
          paths.add(pathValue);
        }
      }
      continue;
    }
    collectQualityGatesPathValues(entry, paths);
  }
};

const readQualityGatesIntegrationPaths = async (
  workspaceRoot: string,
  workspaceSlug: string
): Promise<ReadonlySet<string>> => {
  const artifactPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    workspaceSlug,
    QUALITY_GATES_ARTIFACT_PATH
  );
  const content = await readFile(artifactPath, "utf8").catch(() => null);
  const parsed = content ? parseJsonObject(content) : null;
  const paths = new Set<string>();
  collectQualityGatesPathValues(parsed, paths);
  return paths;
};

const matchesQualityGatesDeclaredPath = (
  file: string,
  declaredPaths: ReadonlySet<string>
): boolean => {
  for (const declaredPath of declaredPaths) {
    if (declaredPath.endsWith("/**")) {
      const prefix = declaredPath.slice(0, -"**".length);
      if (file.startsWith(prefix)) {
        return true;
      }
      continue;
    }
    if (declaredPath.endsWith("/")) {
      if (file.startsWith(declaredPath)) {
        return true;
      }
      continue;
    }
    if (file === declaredPath) {
      return true;
    }
  }
  return false;
};

const isKnownQualityGatesIntegrationPath = (file: string): boolean =>
  file.startsWith("scripts/gates/") ||
  file.startsWith("scripts/quality-gates/") ||
  file.startsWith("scripts/qg/") ||
  file === "biome.jsonc" ||
  file === ".oxlintrc.json" ||
  file === ".oxfmtrc.json" ||
  file === "oxlint.json" ||
  file === "oxlint.config.json" ||
  file === "oxfmt.json" ||
  file === "oxfmt.config.json" ||
  QG_TSCONFIG_RE.test(file);

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
  const qualityGatesIntegrationPaths = await readQualityGatesIntegrationPaths(
    workspaceRoot,
    workspaceSlug
  );
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
      isKnownQualityGatesIntegrationPath(file) ||
      matchesQualityGatesDeclaredPath(file, qualityGatesIntegrationPaths) ||
      file === ".husky/pre-commit" ||
      file === ".husky/pre-push" ||
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
