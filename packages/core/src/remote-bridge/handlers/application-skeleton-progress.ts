import { readFile, stat } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";
import { validateApplicationSkeletonMaterialization } from "./application-skeleton-materialization-validator";

export type ApplicationSkeletonSubstep =
  | "artifact"
  | "awaiting_acceptance"
  | "accepted"
  | "materializing"
  | "materialized"
  | "failed"
  | "outdated";

export interface ApplicationSkeletonProgressSnapshot {
  readonly accepted: boolean;
  readonly foundationReady: boolean;
  readonly mapExists: boolean;
  readonly mappingReady: boolean;
  readonly markdownExists: boolean;
  readonly materializationState: ApplicationSkeletonSubstep;
  readonly materialized: boolean;
  readonly observedMaterialization: boolean;
  readonly substep: ApplicationSkeletonSubstep;
  readonly validationErrors: readonly string[];
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

const readMaterializedFlag = (
  value: Record<string, unknown> | null
): boolean => {
  if (!value) {
    return false;
  }
  if (value.materialized === true) {
    return true;
  }
  const materialization = value.materialization;
  return (
    typeof materialization === "object" &&
    materialization !== null &&
    !Array.isArray(materialization) &&
    (materialization as Record<string, unknown>).materialized === true
  );
};

const readMaterializationState = (
  value: Record<string, unknown> | null
): ApplicationSkeletonSubstep => {
  let raw: unknown = null;
  if (typeof value?.materializationState === "string") {
    raw = value.materializationState;
  } else if (typeof value?.status === "string") {
    raw = value.status;
  }
  if (
    raw === "materializing" ||
    raw === "in_progress" ||
    raw === "materialized" ||
    raw === "failed" ||
    raw === "outdated"
  ) {
    return raw === "in_progress" ? "materializing" : raw;
  }
  return "artifact";
};

const resolveSubstep = (params: {
  readonly accepted: boolean;
  readonly materializationState: ApplicationSkeletonSubstep;
  readonly materialized: boolean;
  readonly mapExists: boolean;
  readonly markdownExists: boolean;
}): ApplicationSkeletonSubstep => {
  if (params.materialized) {
    return "materialized";
  }
  if (
    params.materializationState === "materializing" ||
    params.materializationState === "failed" ||
    params.materializationState === "outdated"
  ) {
    return params.materializationState;
  }
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
  const { observedMaterialization, validationErrors } =
    await validateApplicationSkeletonMaterialization({
      mapJson,
      markdown,
      workspaceRoot: params.workspaceRoot,
    });
  const foundationReady =
    accepted && observedMaterialization && validationErrors.length === 0;
  const materialized =
    foundationReady &&
    markdownExists &&
    mapExists &&
    readMaterializedFlag(mapJson);
  let materializationState = readMaterializationState(mapJson);
  if (materialized) {
    materializationState = "materialized";
  } else if (observedMaterialization && validationErrors.length > 0) {
    materializationState = "failed";
  }
  return {
    accepted,
    foundationReady,
    materializationState,
    materialized,
    mapExists,
    mappingReady: mapExists,
    markdownExists,
    observedMaterialization,
    substep: resolveSubstep({
      accepted,
      materializationState,
      materialized,
      mapExists,
      markdownExists,
    }),
    validationErrors,
  };
};
