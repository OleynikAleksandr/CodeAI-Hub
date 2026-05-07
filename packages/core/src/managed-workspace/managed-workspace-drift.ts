export type ManagedWorkspaceSemanticDriftCode =
  | "application_skeleton_outdated"
  | "quality_gates_outdated"
  | "upstream_stage_edit_attempt"
  | "workflow_revision_conflict";

export interface ManagedWorkspaceSemanticDriftInput {
  readonly affectedPaths: readonly string[];
  readonly code: ManagedWorkspaceSemanticDriftCode;
  readonly detail: string;
  readonly recommendedOwner: "agent" | "core" | "user";
}

export interface ManagedWorkspaceSemanticDriftIssue
  extends ManagedWorkspaceSemanticDriftInput {
  readonly blocking: true;
  readonly repairMode: "decision_required";
}

export interface ManagedWorkspaceSemanticDriftReport {
  readonly issues: readonly ManagedWorkspaceSemanticDriftIssue[];
  readonly ok: boolean;
  readonly schema: "codeai-managed-workspace-semantic-drift-v1";
}

export const createManagedWorkspaceSemanticDriftReport = (
  issues: readonly ManagedWorkspaceSemanticDriftInput[]
): ManagedWorkspaceSemanticDriftReport => ({
  schema: "codeai-managed-workspace-semantic-drift-v1",
  ok: issues.length === 0,
  issues: issues.map((issue) => ({
    ...issue,
    affectedPaths: [...issue.affectedPaths].sort(),
    blocking: true,
    repairMode: "decision_required",
  })),
});
