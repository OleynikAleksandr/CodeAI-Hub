import { stat } from "node:fs/promises";
import path from "node:path";
import { classifyManagedTerminalDirtyTree } from "../managed-terminal-dirty-classifier";

const PATH_SEPARATOR_RE = /\//u;
const EXECUTE_PERMISSION_DIVISORS = [64, 8, 1] as const;

const isLikelyRootBuildArtifact = async (params: {
  readonly pathValue: string;
  readonly workspaceRoot: string;
}): Promise<boolean> => {
  if (
    PATH_SEPARATOR_RE.test(params.pathValue) ||
    path.extname(params.pathValue).length > 0
  ) {
    return false;
  }
  const fileStat = await stat(
    path.join(params.workspaceRoot, params.pathValue)
  ).catch(() => null);
  return Boolean(
    fileStat?.isFile() &&
      EXECUTE_PERMISSION_DIVISORS.some(
        (divisor) => Math.floor(fileStat.mode / divisor) % 2 === 1
      )
  );
};

export const collectQualityGatesTerminalResidueDiagnostics = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const classification = await classifyManagedTerminalDirtyTree({
    stage: "quality_gates",
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  }).catch(() => null);
  if (!classification) {
    return [];
  }
  const diagnostics: string[] = [];
  for (const pathValue of classification.unclassifiedPaths) {
    if (
      await isLikelyRootBuildArtifact({
        pathValue,
        workspaceRoot: params.workspaceRoot,
      })
    ) {
      diagnostics.push(
        `generated_root_build_artifact:${pathValue}; remove this generated root artifact and update the Quality Gates build command so it writes build output outside the workspace root.`
      );
    }
  }
  return diagnostics;
};
