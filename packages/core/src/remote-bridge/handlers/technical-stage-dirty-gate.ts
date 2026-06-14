import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type TechnicalStageId =
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

export interface TechnicalStageDirtyStatus {
  readonly clean: boolean;
  readonly dirtyByStage: Readonly<Record<TechnicalStageId, readonly string[]>>;
  readonly dirtyFiles: readonly string[];
}

const APPLICATION_SKELETON_ARTIFACT_PATH =
  "application_skeleton/application-skeleton-map.json";
const QUALITY_GATES_ARTIFACT_PATH = "quality_gates/quality-gates.json";
const APPLICATION_SKELETON_PATH_KEYS = new Set([
  "codePath",
  "materializedPaths",
  "plannedMaterializedPaths",
  "plannedPaths",
]);
const QUALITY_GATES_PATH_KEYS = new Set([
  "integratedPaths",
  "plannedIntegrationPaths",
  "integrationPaths",
  "plannedPaths",
]);
const QG_TSCONFIG_RE = /^tsconfig\.qg(?:\.[a-z0-9-]+)?\.json$/u;
const MANAGED_WORKSPACE_LEDGER_RE =
  /^doc\/TODO\/(?:workspace\.plan\.md|stages\/(?:application-skeleton|diagram-modules|quality-gates)\/todo-plan\.md)$/u;
const DEVELOPMENT_TREE_PRODUCT_PART_TODO_RE =
  /^doc\/TODO\/stages\/development-tree\/product-parts\/[^/]+\/todo-plan\.md$/u;
const PATH_SEGMENT_SEPARATOR_RE = /[\\/]+/u;
const PRODUCT_PART_DOCUMENTATION_FILENAMES = new Set([
  "DevelopmentOrderPlan.draft.json",
  "DevelopmentOrderPlan.draft.md",
  "ProductPartDevelopmentBrief.draft.md",
]);

const isNonSemanticDiagramModulesSidecar = (
  file: string,
  workspaceSlug: string
): boolean =>
  file === `.codeai-hub/${workspaceSlug}/diagram_modules/module-map.flow.json`;

const isVolatileProviderRuntimePath = (
  file: string,
  workspaceSlug: string
): boolean => {
  const providerRoot = `.codeai-hub/${workspaceSlug}/runtime/providers/`;
  if (!file.startsWith(providerRoot)) {
    return false;
  }
  return (
    file.includes("/home/shell_snapshots/") ||
    file.includes("/home/.claude/backups/") ||
    file.includes("/home/.claude/projects/") ||
    file.includes("/home/.claude/sessions/")
  );
};

const isVolatileCoreMetadataPath = (
  file: string,
  workspaceSlug: string
): boolean =>
  file === ".DS_Store" ||
  file.endsWith("/.DS_Store") ||
  file.startsWith(".codeai-hub/state/") ||
  MANAGED_WORKSPACE_LEDGER_RE.test(file) ||
  file.startsWith("node_modules/") ||
  file.startsWith(`.codeai-hub/${workspaceSlug}/continuity/`) ||
  file.startsWith(`.codeai-hub/${workspaceSlug}/description/`) ||
  file.startsWith(`.codeai-hub/${workspaceSlug}/virtual_simulation/`) ||
  isNonSemanticDiagramModulesSidecar(file, workspaceSlug) ||
  isVolatileProviderRuntimePath(file, workspaceSlug) ||
  file.startsWith(`.codeai-hub/${workspaceSlug}/workflow/checkpoints/`) ||
  file === `.codeai-hub/${workspaceSlug}/workflow/state.json` ||
  file === `.codeai-hub/${workspaceSlug}/workflow/undo-ledger.json`;

const isDevelopmentTreeProductPartDocumentationPath = (
  file: string,
  workspaceSlug: string
): boolean => {
  const materializedRoot = `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/`;
  if (file.startsWith(materializedRoot)) {
    const parts = file.slice(materializedRoot.length).split("/");
    return (
      parts.length === 2 && PRODUCT_PART_DOCUMENTATION_FILENAMES.has(parts[1])
    );
  }
  const managedRoot = `.codeai-hub/${workspaceSlug}/workflow/managed/development-tree-product-parts/`;
  if (file.startsWith(managedRoot)) {
    const filename = file.slice(managedRoot.length);
    return !filename.includes("/") && filename.endsWith(".json");
  }
  return DEVELOPMENT_TREE_PRODUCT_PART_TODO_RE.test(file);
};

const isIgnoredTechnicalDirtyPath = (
  file: string,
  workspaceSlug: string
): boolean =>
  isVolatileCoreMetadataPath(file, workspaceSlug) ||
  isDevelopmentTreeProductPartDocumentationPath(file, workspaceSlug);

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

const collectTechnicalStagePathValues = (
  value: unknown,
  keys: ReadonlySet<string>,
  paths: Set<string>
): void => {
  if (!(typeof value === "object" && value !== null)) {
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectTechnicalStagePathValues(entry, keys, paths);
    }
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (keys.has(key)) {
      const pathValues = Array.isArray(entry) ? entry : [entry];
      for (const pathValue of pathValues) {
        if (
          typeof pathValue === "string" &&
          isSafeRelativeWorkspacePath(pathValue)
        ) {
          paths.add(pathValue);
        }
      }
      continue;
    }
    collectTechnicalStagePathValues(entry, keys, paths);
  }
};

const readTechnicalStageDeclaredPaths = async (
  workspaceRoot: string,
  workspaceSlug: string,
  artifactPath: string,
  keys: ReadonlySet<string>
): Promise<ReadonlySet<string>> => {
  const absoluteArtifactPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    workspaceSlug,
    artifactPath
  );
  const content = await readFile(absoluteArtifactPath, "utf8").catch(
    () => null
  );
  const parsed = content ? parseJsonObject(content) : null;
  const paths = new Set<string>();
  collectTechnicalStagePathValues(parsed, keys, paths);
  return paths;
};

const matchesDeclaredPath = (
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
    if (file.startsWith(`${declaredPath}/`)) {
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

export const readTechnicalStageDirtyStatus = async (
  workspaceRoot: string,
  workspaceSlug: string
): Promise<TechnicalStageDirtyStatus> => {
  const { stdout } = await execFileAsync(
    "git",
    ["status", "--short", "--untracked-files=all"],
    { cwd: workspaceRoot }
  ).catch(() => ({ stdout: "" }));
  const dirtyFiles = stdout
    .split("\n")
    .map((line) => parseGitStatusPath(line))
    .filter((entry): entry is string => Boolean(entry))
    .filter((file) => !isIgnoredTechnicalDirtyPath(file, workspaceSlug));
  const dirtyByStage: Record<TechnicalStageId, string[]> = {
    diagram_modules: [],
    application_skeleton: [],
    quality_gates: [],
  };
  const applicationSkeletonDeclaredPaths =
    await readTechnicalStageDeclaredPaths(
      workspaceRoot,
      workspaceSlug,
      APPLICATION_SKELETON_ARTIFACT_PATH,
      APPLICATION_SKELETON_PATH_KEYS
    );
  const qualityGatesIntegrationPaths = await readTechnicalStageDeclaredPaths(
    workspaceRoot,
    workspaceSlug,
    QUALITY_GATES_ARTIFACT_PATH,
    QUALITY_GATES_PATH_KEYS
  );
  for (const file of dirtyFiles) {
    if (
      file.startsWith(`.codeai-hub/${workspaceSlug}/application_skeleton/`) ||
      file.startsWith(
        `.codeai-hub/${workspaceSlug}/workflow/revisions/application-skeleton/`
      ) ||
      file.startsWith("product-parts/") ||
      matchesDeclaredPath(file, applicationSkeletonDeclaredPaths)
    ) {
      dirtyByStage.application_skeleton.push(file);
    }
    if (
      file.startsWith(`.codeai-hub/${workspaceSlug}/diagram_modules/`) ||
      file.startsWith(
        `.codeai-hub/${workspaceSlug}/workflow/revisions/diagram-modules/`
      )
    ) {
      dirtyByStage.diagram_modules.push(file);
    }
    if (
      file.startsWith(`.codeai-hub/${workspaceSlug}/quality_gates/`) ||
      file.startsWith(
        `.codeai-hub/${workspaceSlug}/workflow/revisions/quality-gates/`
      ) ||
      isKnownQualityGatesIntegrationPath(file) ||
      matchesDeclaredPath(file, qualityGatesIntegrationPaths) ||
      file === ".husky/pre-commit" ||
      file === ".husky/pre-push" ||
      file === "package.json" ||
      file === "package-lock.json"
    ) {
      dirtyByStage.quality_gates.push(file);
    }
  }
  return { clean: dirtyFiles.length === 0, dirtyByStage, dirtyFiles };
};

export const listDirtyFilesOutsideTechnicalStage = (
  status: TechnicalStageDirtyStatus,
  stage: TechnicalStageId
): readonly string[] => {
  const allowed = new Set(status.dirtyByStage[stage]);
  return status.dirtyFiles.filter((file) => !allowed.has(file));
};

const formatDirtyGateError = (
  stageTitle: string,
  files: readonly string[]
): string =>
  `Rewrite boundary blocked ${stageTitle}-owned files: ${files.join(", ")}. Respond with a content-readiness note or blocker only; do not run Git, staging, or plan commands.`;

export const attachTechnicalStageDirtyFiles = <T extends object>(
  progress: T | null,
  files: readonly string[]
): T | null =>
  progress && files.length > 0
    ? ({
        ...progress,
        aggregateReady: false,
        technicalStageDirtyFiles: files,
      } as T)
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
