import path from "node:path";
import type { WorkflowStageId } from "../watcher/watcher-types";
import type {
  WorkflowArtifactFileName,
  WorkflowArtifactPathParams,
  WorkflowArtifactPathResult,
} from "./workflow-paths-types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const WORKFLOW_STAGE_SET = new Set<WorkflowStageId>([
  "description",
  "virtual_simulation",
  "diagram_modules",
  "diagram_facades",
]);

const WORKFLOW_STAGE_FILES = new Map<WorkflowStageId, WorkflowArtifactFileName>(
  [
    ["description", "description.md"],
    ["virtual_simulation", "virtual-simulation.md"],
    ["diagram_modules", "modules-diagram.mmd"],
    ["diagram_facades", "facades-graph.mmd"],
  ]
);

const isWorkflowStage = (value: string): value is WorkflowStageId =>
  WORKFLOW_STAGE_SET.has(value as WorkflowStageId);

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

export const resolveWorkflowArtifactPaths = (
  params: WorkflowArtifactPathParams
): WorkflowArtifactPathResult => {
  if (!isWorkflowStage(params.stage)) {
    return { ok: false, error: `Unsupported workflow stage: ${params.stage}` };
  }
  if (!(SLUG_RE.test(params.workspaceSlug) && SLUG_RE.test(params.runSlug))) {
    return { ok: false, error: "Invalid workspaceSlug/runSlug" };
  }

  const expectedFileName = WORKFLOW_STAGE_FILES.get(params.stage);
  if (!expectedFileName) {
    return { ok: false, error: "Unsupported workflow stage" };
  }
  if (expectedFileName !== params.fileName) {
    return {
      ok: false,
      error: `File ${params.fileName} is not allowed for stage ${params.stage}`,
    };
  }

  const relativePath = `.codeai-hub/${params.workspaceSlug}/${params.stage}/runs/${params.runSlug}/${params.fileName}`;
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
      runSlug: params.runSlug,
      fileName: params.fileName,
      relativePath,
      absolutePath,
    },
  };
};
