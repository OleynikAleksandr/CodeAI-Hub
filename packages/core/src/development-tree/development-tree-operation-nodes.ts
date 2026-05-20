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

export const createModuleOperationNodes = (
  moduleWorkflowPath: string,
  workspaceSlug: string
): readonly DevelopmentTreeOperationNode[] => {
  const workspacePath = createArtifactWorkspacePath(
    workspaceSlug,
    moduleWorkflowPath
  );
  return [
    {
      id: "module-facade-specification",
      kind: "module_facade_specification",
      title: "Module / Facade Specification",
      workflowPath: moduleWorkflowPath,
      artifactWorkspacePath: workspacePath,
    },
    {
      id: "implementation",
      kind: "implementation",
      title: "Implementation",
      workflowPath: `${moduleWorkflowPath}/implementation`,
      artifactWorkspacePath: workspacePath,
      children: [
        createLeafOperationNode({
          kind: "workers",
          title: "Workers",
          moduleWorkflowPath,
          workspaceSlug,
        }),
        createLeafOperationNode({
          kind: "integration",
          title: "Integration",
          moduleWorkflowPath,
          workspaceSlug,
        }),
      ],
    },
  ];
};
