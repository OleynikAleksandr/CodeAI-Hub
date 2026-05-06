import { readFile, stat } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";

export type ApplicationSkeletonSubstep =
  | "artifact"
  | "awaiting_acceptance"
  | "accepted";

export interface ApplicationSkeletonProgressSnapshot {
  readonly accepted: boolean;
  readonly mapExists: boolean;
  readonly mappingReady: boolean;
  readonly markdownExists: boolean;
  readonly substep: ApplicationSkeletonSubstep;
}

const readExistingFile = async (
  absolutePath: string
): Promise<string | null> => {
  const fileStat = await stat(absolutePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }
  return readFile(absolutePath, "utf8").catch(() => null);
};

const parseJsonObject = (
  content: string | null
): Record<string, unknown> | null => {
  if (!content) {
    return null;
  }
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

const readAcceptedFlag = (value: Record<string, unknown> | null): boolean => {
  if (!value) {
    return false;
  }
  if (value.accepted === true) {
    return true;
  }
  const acceptance = value.acceptance;
  return (
    typeof acceptance === "object" &&
    acceptance !== null &&
    !Array.isArray(acceptance) &&
    (acceptance as Record<string, unknown>).accepted === true
  );
};

const resolveSubstep = (params: {
  readonly accepted: boolean;
  readonly mapExists: boolean;
  readonly markdownExists: boolean;
}): ApplicationSkeletonSubstep => {
  if (params.accepted) {
    return "accepted";
  }
  return params.markdownExists && params.mapExists
    ? "awaiting_acceptance"
    : "artifact";
};

export const readApplicationSkeletonProgressSnapshot = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ApplicationSkeletonProgressSnapshot | null> => {
  const markdownPath = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: "application_skeleton",
    fileName: "application-skeleton.md",
  });
  const mapPath = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: "application_skeleton",
    fileName: "application-skeleton-map.json",
  });
  if (!(markdownPath.ok && mapPath.ok)) {
    return null;
  }

  const markdown = await readExistingFile(markdownPath.value.absolutePath);
  const mapJson = parseJsonObject(
    await readExistingFile(mapPath.value.absolutePath)
  );
  const markdownExists = Boolean(markdown);
  const mapExists = Boolean(mapJson);
  if (!(markdownExists || mapExists)) {
    return null;
  }

  const accepted = markdownExists && mapExists && readAcceptedFlag(mapJson);
  return {
    accepted,
    mapExists,
    mappingReady: mapExists,
    markdownExists,
    substep: resolveSubstep({ accepted, mapExists, markdownExists }),
  };
};
