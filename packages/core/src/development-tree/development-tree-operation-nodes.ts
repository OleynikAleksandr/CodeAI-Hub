import path from "node:path";
import type { DevelopmentTreeOperationNode } from "./development-tree-types";

export const createArtifactWorkspacePath = (
  workspaceSlug: string,
  workflowPath: string
): string => path.posix.join(".codeai-hub", workspaceSlug, workflowPath);

const createLeafOperationNode = (params: {
  readonly kind: "integration" | "workers";
  readonly moduleWorkflowPath: string;
  readonly title: string;
  readonly workspaceSlug: string;
}): DevelopmentTreeOperationNode => {
  const workflowPath = `${params.moduleWorkflowPath}/${params.kind}`;
  return {
    id: params.kind,
    kind: params.kind,
    title: params.title,
    workflowPath,
    artifactWorkspacePath: createArtifactWorkspacePath(
      params.workspaceSlug,
      workflowPath
    ),
  };
};

const LEAD_ORCHESTRATION_WORKFLOW_SEGMENT = "lead-product-part-orchestration";
const LEAD_ORCHESTRATION_CHILDREN = [
  { id: "contract-graph", kind: "contract_graph", title: "Contract Graph" },
  {
    id: "cross-part-contracts",
    kind: "cross_part_contracts",
    title: "Cross-Part Contracts",
  },
  {
    id: "shared-interfaces",
    kind: "shared_interfaces",
    title: "Shared Interfaces",
  },
  { id: "execution-waves", kind: "execution_waves", title: "Execution Waves" },
] as const;

const asOperationKind = (
  kind:
    | (typeof LEAD_ORCHESTRATION_CHILDREN)[number]["kind"]
    | "lead_orchestration"
): DevelopmentTreeOperationNode["kind"] =>
  kind as DevelopmentTreeOperationNode["kind"];

export const createLeadProductPartOperationNodes = (
  partWorkflowPath: string,
  workspaceSlug: string
): readonly DevelopmentTreeOperationNode[] => {
  const workflowPath = `${partWorkflowPath}/${LEAD_ORCHESTRATION_WORKFLOW_SEGMENT}`;
  return [
    {
      id: LEAD_ORCHESTRATION_WORKFLOW_SEGMENT,
      kind: asOperationKind("lead_orchestration"),
      title: "Lead Product Part Orchestration",
      workflowPath,
      artifactWorkspacePath: createArtifactWorkspacePath(
        workspaceSlug,
        workflowPath
      ),
      children: LEAD_ORCHESTRATION_CHILDREN.map((child) => {
        const childWorkflowPath = `${workflowPath}/${child.id}`;
        return {
          id: child.id,
          kind: asOperationKind(child.kind),
          title: child.title,
          workflowPath: childWorkflowPath,
          artifactWorkspacePath: createArtifactWorkspacePath(
            workspaceSlug,
            childWorkflowPath
          ),
        };
      }),
    },
  ];
};

export const createModuleOperationNodes = (
  _moduleWorkflowPath: string,
  _workspaceSlug: string
): readonly DevelopmentTreeOperationNode[] => [];

export const createClusterOperationNodes = (
  clusterWorkflowPath: string,
  workspaceSlug: string
): readonly DevelopmentTreeOperationNode[] => [
  createLeafOperationNode({
    kind: "workers",
    title: "Workers",
    moduleWorkflowPath: clusterWorkflowPath,
    workspaceSlug,
  }),
  createLeafOperationNode({
    kind: "integration",
    title: "Integration",
    moduleWorkflowPath: clusterWorkflowPath,
    workspaceSlug,
  }),
];
