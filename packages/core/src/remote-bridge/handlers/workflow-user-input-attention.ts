const USER_GATE_INPUT_LOCK_REASON = "Another user gate is active.";

type DocumentationGateStage =
  | "application_skeleton"
  | "description"
  | "diagram_modules"
  | "quality_gates"
  | "virtual_simulation";

export interface WorkflowInputAttentionDevelopmentTree {
  readonly activeUserGate?: unknown;
  readonly queuedUserGates?: readonly unknown[];
}

export interface WorkflowInputAttentionCursor {
  readonly activeUserGate: Record<string, unknown> | null;
  readonly queuedUserGates: readonly Record<string, unknown>[];
}

export interface WorkflowInputAttentionDocumentationStage {
  readonly artifactPaths?: readonly string[];
  readonly progress: { readonly substep?: string } | null;
  readonly reviewActionPending?: boolean;
  readonly reviewOpen?: boolean;
  readonly stage: DocumentationGateStage;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const DOCUMENTATION_STAGE_ARTIFACTS: Record<DocumentationGateStage, string> = {
  application_skeleton: "application-skeleton.md",
  description: "Final_Description.md",
  diagram_modules: "product-parts.index.md",
  quality_gates: "quality-gates.md",
  virtual_simulation: "virtual-simulation.md",
};

const normalizeQueuedGate = (
  gate: Record<string, unknown>
): Record<string, unknown> => ({
  ...gate,
  inputLocked: true,
  inputLockReason: USER_GATE_INPUT_LOCK_REASON,
  status: "queued",
});

const normalizeActiveGate = (
  gate: Record<string, unknown>
): Record<string, unknown> => ({
  ...gate,
  inputLocked: false,
  status: "active",
});

const createDocumentationUserGate = (params: {
  readonly artifactPaths?: readonly string[];
  readonly progress: { readonly substep?: string } | null;
  readonly reviewActionPending?: boolean;
  readonly reviewOpen?: boolean;
  readonly stage: DocumentationGateStage;
  readonly workspaceSlug: string;
}): Record<string, unknown> | null => {
  if (params.reviewActionPending === true) {
    return null;
  }
  if (
    params.progress?.substep !== "awaiting_acceptance" &&
    params.reviewOpen !== true
  ) {
    return null;
  }
  const fileName = DOCUMENTATION_STAGE_ARTIFACTS[params.stage];
  return {
    artifactPaths: params.artifactPaths ?? [
      `.codeai-hub/${params.workspaceSlug}/${params.stage}/${fileName}`,
    ],
    id: `workflow:${params.stage}/review`,
    nodeId: `workflow:${params.stage}`,
    nodeKind: "workflow_stage",
    reason: "managed_stage_review_required",
    stage: params.stage,
  };
};

export const resolveWorkflowUserInputAttentionCursor = (params: {
  readonly developmentTree: WorkflowInputAttentionDevelopmentTree;
  readonly documentationStages: readonly WorkflowInputAttentionDocumentationStage[];
  readonly workspaceSlug: string;
}): WorkflowInputAttentionCursor => {
  const developmentTreeGates = [
    params.developmentTree.activeUserGate,
    ...(params.developmentTree.queuedUserGates ?? []),
  ].filter(isObjectRecord);
  const documentationGates = params.documentationStages
    .map((stage) =>
      createDocumentationUserGate({
        artifactPaths: stage.artifactPaths,
        progress: stage.progress,
        reviewActionPending: stage.reviewActionPending,
        reviewOpen: stage.reviewOpen,
        stage: stage.stage,
        workspaceSlug: params.workspaceSlug,
      })
    )
    .filter(isObjectRecord);
  const gates: Record<string, unknown>[] = [
    ...developmentTreeGates,
    ...documentationGates,
  ];
  return {
    activeUserGate: gates[0] ? normalizeActiveGate(gates[0]) : null,
    queuedUserGates: gates.slice(1).map(normalizeQueuedGate),
  };
};
