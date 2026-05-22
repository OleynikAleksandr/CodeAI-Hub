import type {
  DevelopmentTreePartNode,
  DevelopmentTreeReadiness,
  DiagramModulesProgressSnapshot,
} from "../../services/workflow-state-client";
import type { TreeNode } from "./workspace-tree-model";

const readStringArray = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

export const resolvePartProgressVisuals = (
  part: DevelopmentTreePartNode,
  progress?: DiagramModulesProgressSnapshot | null
): {
  readonly readiness?: DevelopmentTreeReadiness;
  readonly status?: TreeNode["status"];
  readonly title?: string;
} => {
  if (!progress) {
    return {};
  }
  const acceptedPartIds = readStringArray(progress.acceptedPartIds);
  const generatedPartIds = readStringArray(progress.generatedPartIds);
  if (acceptedPartIds.includes(part.id) || generatedPartIds.includes(part.id)) {
    return { readiness: "ready", status: "active", title: "Accepted by Core." };
  }
  const activeSubturn = progress.activeSubturn;
  const isActiveProductPart =
    activeSubturn?.kind === "product_part" && activeSubturn.partId === part.id;
  if (isActiveProductPart && activeSubturn.status === "repair_pending") {
    return {
      readiness: "in_progress",
      status: "blocked",
      title: "Repair pending for this Product Part.",
    };
  }
  if (
    isActiveProductPart ||
    (typeof progress.currentPartId === "string" &&
      progress.currentPartId === part.id)
  ) {
    return {
      readiness: "in_progress",
      status: "progress",
      title: "Current Core target Product Part.",
    };
  }
  return { readiness: "idle", status: "todo", title: "Pending Core turn." };
};
