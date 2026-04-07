import path from "node:path";
import type { WorkflowStageId } from "../watcher/watcher-types";
import type {
  WorkflowArtifactFileName,
  WorkflowArtifactPathParams,
  WorkflowArtifactPathResult,
} from "./workflow-paths-types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PART_ID_FILE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

const WORKFLOW_STAGE_SET = new Set<WorkflowStageId>([
  "description",
  "virtual_simulation",
  "diagram_modules",
]);

const WORKFLOW_STAGE_FILES = new Map<
  WorkflowStageId,
  readonly WorkflowArtifactFileName[]
>([
  ["description", ["Final_Description.md"]],
  ["virtual_simulation", ["virtual-simulation.md"]],
  [
    "diagram_modules",
    ["product-parts.index.md", "product-part.md", "module-map.flow.json"],
  ],
]);

const isWorkflowStage = (value: string): value is WorkflowStageId =>
  WORKFLOW_STAGE_SET.has(value as WorkflowStageId);

const normalizeRelativePath = (value: string): string => {
  const normalized = value.replace(/\\/g, "/").trim();
  const trimmed = normalized.startsWith("./")
    ? normalized.slice(2)
    : normalized;
  return path.posix.normalize(trimmed);
};

const resolveWorkflowRootPrefix = (workspaceSlug: string): string | null => {
  if (!SLUG_RE.test(workspaceSlug)) {
    return null;
  }
  return `.codeai-hub/${workspaceSlug}/`;
};

const resolveSafeArtifactPath = (
  workspaceRoot: string,
  relativePath: string
): string | null => {
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    return null;
  }
  return resolvedPath;
};

export const isWorkflowWorkspacePathAllowed = (params: {
  readonly relativePath: string;
  readonly workspaceSlug: string;
}): boolean => {
  const prefix = resolveWorkflowRootPrefix(params.workspaceSlug);
  if (!prefix) {
    return false;
  }
  const normalizedPath = normalizeRelativePath(params.relativePath);
  return normalizedPath.startsWith(prefix);
};

export const resolveWorkflowArtifactPaths = (
  params: WorkflowArtifactPathParams
): WorkflowArtifactPathResult => {
  if (!isWorkflowStage(params.stage)) {
    return { ok: false, error: `Unsupported workflow stage: ${params.stage}` };
  }
  if (!SLUG_RE.test(params.workspaceSlug)) {
    return { ok: false, error: "Invalid workspaceSlug" };
  }

  const allowedFileNames = WORKFLOW_STAGE_FILES.get(params.stage);
  if (!allowedFileNames) {
    return { ok: false, error: "Unsupported workflow stage" };
  }
  if (!allowedFileNames.includes(params.fileName)) {
    return {
      ok: false,
      error: `File ${params.fileName} is not allowed for stage ${params.stage}`,
    };
  }

  const relativePath =
    params.stage === "diagram_modules" && params.fileName === "product-part.md"
      ? resolveProductPartRelativePath(params)
      : `.codeai-hub/${params.workspaceSlug}/${params.stage}/${params.fileName}`;
  if (!relativePath) {
    return { ok: false, error: "Invalid product part path parameters" };
  }
  const absolutePath = resolveSafeArtifactPath(
    params.workspaceRoot,
    relativePath
  );
  if (!absolutePath) {
    return { ok: false, error: "Unsafe artifact path" };
  }

  return {
    ok: true,
    value: {
      stage: params.stage,
      fileName: params.fileName,
      partId:
        params.stage === "diagram_modules" &&
        params.fileName === "product-part.md"
          ? params.partId
          : undefined,
      relativePath,
      absolutePath,
    },
  };
};

const resolveProductPartRelativePath = (
  params: WorkflowArtifactPathParams
): string | null => {
  if (
    !(
      params.stage === "diagram_modules" &&
      params.fileName === "product-part.md"
    )
  ) {
    return null;
  }
  if (!SLUG_RE.test(params.partId ?? "")) {
    return null;
  }
  const fileName = `${params.partId}.md`;
  if (!PART_ID_FILE_RE.test(fileName)) {
    return null;
  }
  return `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${fileName}`;
};
