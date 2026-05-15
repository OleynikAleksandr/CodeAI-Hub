import type {
  ContinuityChainSnapshot,
  WorkflowStageId,
  WorkflowStateSnapshot,
} from "./workflow-state-client";

const STAGE_ORDER: readonly WorkflowStageId[] = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
];

const DIAGRAM_MODULES_PROGRESS_KEYS = [
  "aggregateReady",
  "currentPartId",
  "generatedCount",
  "nextPartId",
  "plannedCount",
  "substep",
] as const;

const TECHNICAL_PROGRESS_KEYS = [
  "integrated",
  "jsonExists",
  "mapExists",
  "markdownExists",
  "materialized",
] as const;

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const scalarToken = (value: unknown): string => {
  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return String(value);
  }
  return "";
};

const stringArrayToken = (value: unknown): string =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").join(",")
    : "";

const progressFieldsToken = (
  progress: Record<string, unknown> | null | undefined,
  keys: readonly string[]
): string => {
  if (!progress) {
    return "";
  }
  return keys.map((key) => `${key}:${scalarToken(progress[key])}`).join("|");
};

const activeSubturnToken = (
  progress: Record<string, unknown> | null | undefined
): string => {
  const activeSubturn = readRecord(progress?.activeSubturn);
  if (!activeSubturn) {
    return "";
  }
  return [
    scalarToken(activeSubturn.kind),
    scalarToken(activeSubturn.partId),
    scalarToken(activeSubturn.status),
  ].join(":");
};

const continuityToken = (
  chains: readonly ContinuityChainSnapshot[]
): string =>
  chains
    .map((chain) => {
      const lastSegment = chain.segments.at(-1);
      return [
        chain.stage,
        chain.updatedAt,
        String(chain.segments.length),
        lastSegment?.providerId ?? "",
        lastSegment?.providerSessionId ?? "",
      ].join(":");
    })
    .join("|");

export const buildWorkflowStateChangeToken = (
  snapshot: WorkflowStateSnapshot | null
): string => {
  if (!snapshot) {
    return "null";
  }
  const stagesToken = STAGE_ORDER.map(
    (stage) =>
      `${stage}:${snapshot.stages[stage]}:${snapshot.gating.blocked[stage] === true}`
  ).join("|");
  const diagramModulesProgress = snapshot.diagramModulesProgress;
  const applicationSkeletonProgress = snapshot.applicationSkeletonProgress;
  const qualityGatesProgress = snapshot.qualityGatesProgress;

  return [
    `updated:${snapshot.updatedAt}`,
    `stages:${stagesToken}`,
    `continuity:${continuityToken(snapshot.continuity.chains)}`,
    `description:${snapshot.description?.draftPath ?? ""}:${snapshot.description?.finalPath ?? ""}`,
    `last:${snapshot.lastActive?.stage ?? ""}:${snapshot.lastActive?.artifactPath ?? ""}:${snapshot.lastActive?.updatedAt ?? ""}`,
    `diagram:${progressFieldsToken(
      diagramModulesProgress,
      DIAGRAM_MODULES_PROGRESS_KEYS
    )}:${activeSubturnToken(diagramModulesProgress)}:${stringArrayToken(
      diagramModulesProgress?.plannedPartIds
    )}:${stringArrayToken(diagramModulesProgress?.generatedPartIds)}`,
    `application:${progressFieldsToken(
      applicationSkeletonProgress,
      TECHNICAL_PROGRESS_KEYS
    )}`,
    `quality:${progressFieldsToken(
      qualityGatesProgress,
      TECHNICAL_PROGRESS_KEYS
    )}`,
  ].join("\n");
};
