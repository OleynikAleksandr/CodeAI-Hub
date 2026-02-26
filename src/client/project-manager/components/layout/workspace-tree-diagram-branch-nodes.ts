import { getDefaultProviderTitle } from "../../../../types/provider";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import type { SessionResumeIntent } from "./workspace-tree-auto-select";
import type { StageSyncPayload } from "./workspace-tree-branch-nodes";
import type { TreeNode } from "./workspace-tree-model";

const resolveProviderTitle = (providerId: string): string =>
  providerId === "claudeCodeCli" || providerId === "codexCli" || providerId === "geminiCli"
    ? getDefaultProviderTitle(providerId)
    : providerId;

const resolveLatestDiagramChain = (
  chains: WorkflowStateSnapshot["continuity"]["chains"],
  stage: "diagram_modules" | "diagram_facades"
) => {
  let best: (typeof chains)[number] | null = null;
  for (const chain of chains) {
    if (chain.stage !== stage) {
      continue;
    }
    if (chain.segments.length === 0) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = chain;
    }
  }
  return best;
};

export const resolveDiagramStageSyncPayload = (options: {
  readonly stage: "diagram_modules" | "diagram_facades";
  readonly workflowState: WorkflowStateSnapshot;
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly diagramModulesArtifactAvailable?: boolean;
  readonly diagramFacadesArtifactAvailable?: boolean;
}): StageSyncPayload => {
  const { stage, workflowState, workspaceSlug, workspacePath } = options;

  if (stage === "diagram_modules") {
    const chain = resolveLatestDiagramChain(workflowState.continuity.chains, "diagram_modules");
    const last = chain?.segments.at(-1) ?? null;
    const dmArtifactPath = `.codeai-hub/${workspaceSlug}/diagram_modules/modules-diagram.mmd`;
    const available = options.diagramModulesArtifactAvailable ?? false;
    return {
      artifact: available ? { path: dmArtifactPath, label: "modules-diagram.mmd" } : null,
      clearTool: available ? null : "Diagram Modules",
      session: last
        ? {
            providerId: last.providerId,
            providerSessionId: last.providerSessionId,
            workspacePath,
            workspaceSlug,
            initiativeSlug: workspaceSlug,
            stage: "diagram_modules",
            sessionKind: "collector",
            runSlug: null,
          }
        : null,
    };
  }

  const chain = resolveLatestDiagramChain(workflowState.continuity.chains, "diagram_facades");
  const last = chain?.segments.at(-1) ?? null;
  const dfArtifactPath = `.codeai-hub/${workspaceSlug}/diagram_facades/facades-graph.mmd`;
  const available = options.diagramFacadesArtifactAvailable ?? false;
  return {
    artifact: available ? { path: dfArtifactPath, label: "facades-graph.mmd" } : null,
    clearTool: available ? null : "Diagram Facades",
    session: last
      ? {
          providerId: last.providerId,
          providerSessionId: last.providerSessionId,
          workspacePath,
          workspaceSlug,
          initiativeSlug: workspaceSlug,
          stage: "diagram_facades",
          sessionKind: "collector",
          runSlug: null,
        }
      : null,
  };
};

export const buildDiagramModulesBranchNodes = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly diagramModulesArtifactAvailable: boolean;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
  readonly selectArtifact: (artifactPath: string, label: string) => void;
  readonly dispatchDialogOpenIntent: (payload: SessionResumeIntent) => void;
  readonly clearArtifactWithTool: (activeTool: string) => void;
}): readonly TreeNode[] => {
  const workflowState = options.workflowState;
  const workspaceSlug = options.workspaceSlug;
  const workspacePath = options.workspacePath;

  if (!(workflowState && workspaceSlug && workspacePath)) {
    return [];
  }

  const nodes: TreeNode[] = [];
  const dmArtifactPath = `.codeai-hub/${workspaceSlug}/diagram_modules/modules-diagram.mmd`;

  const chain = resolveLatestDiagramChain(
    workflowState.continuity.chains,
    "diagram_modules"
  );
  const last = chain?.segments.at(-1) ?? null;

  if (options.diagramModulesArtifactAvailable) {
    nodes.push({
      id: "workflow:diagram_modules:artifact",
      label: "modules-diagram.mmd",
      title: dmArtifactPath,
      status: "active",
      visualDepth: 2,
      onSelect: () => {
        options.selectArtifact(dmArtifactPath, "modules-diagram.mmd");
        // Sync: open the session for the same stage
        if (last) {
          options.dispatchDialogOpenIntent({
            providerId: last.providerId,
            providerSessionId: last.providerSessionId,
            workspacePath,
            workspaceSlug,
            initiativeSlug: workspaceSlug,
            stage: "diagram_modules",
            sessionKind: "collector",
            runSlug: null,
          });
        }
      },
    });
  }

  if (!(chain && last)) {
    return nodes;
  }

  const providerTitle = resolveProviderTitle(last.providerId);
  nodes.push({
    id: `workflow:diagram_modules:session:${chain.rootSessionId}`,
    label: `Diagram Modules ${providerTitle}`,
    status: "active",
    visualDepth: 2,
    onSelect: () => {
      options.dispatchDialogOpenIntent({
        providerId: last.providerId,
        providerSessionId: last.providerSessionId,
        workspacePath,
        workspaceSlug,
        initiativeSlug: workspaceSlug,
        stage: "diagram_modules",
        sessionKind: "collector",
        runSlug: null,
      });
      // Sync: select the artifact for the same stage, or show DM placeholder
      if (options.diagramModulesArtifactAvailable) {
        options.selectArtifact(dmArtifactPath, "modules-diagram.mmd");
      } else {
        options.clearArtifactWithTool("Diagram Modules");
      }
    },
  });
  return nodes;
};

export const buildDiagramFacadesBranchNodes = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly diagramFacadesArtifactAvailable: boolean;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
  readonly selectArtifact: (artifactPath: string, label: string) => void;
  readonly dispatchDialogOpenIntent: (payload: SessionResumeIntent) => void;
  readonly clearArtifactWithTool: (activeTool: string) => void;
}): readonly TreeNode[] => {
  const workflowState = options.workflowState;
  const workspaceSlug = options.workspaceSlug;
  const workspacePath = options.workspacePath;

  if (!(workflowState && workspaceSlug && workspacePath)) {
    return [];
  }

  const nodes: TreeNode[] = [];
  const dfArtifactPath = `.codeai-hub/${workspaceSlug}/diagram_facades/facades-graph.mmd`;

  const chain = resolveLatestDiagramChain(
    workflowState.continuity.chains,
    "diagram_facades"
  );
  const last = chain?.segments.at(-1) ?? null;

  if (options.diagramFacadesArtifactAvailable) {
    nodes.push({
      id: "workflow:diagram_facades:artifact",
      label: "facades-graph.mmd",
      title: dfArtifactPath,
      status: "active",
      visualDepth: 2,
      onSelect: () => {
        options.selectArtifact(dfArtifactPath, "facades-graph.mmd");
        // Sync: open the session for the same stage
        if (last) {
          options.dispatchDialogOpenIntent({
            providerId: last.providerId,
            providerSessionId: last.providerSessionId,
            workspacePath,
            workspaceSlug,
            initiativeSlug: workspaceSlug,
            stage: "diagram_facades",
            sessionKind: "collector",
            runSlug: null,
          });
        }
      },
    });
  }

  if (!(chain && last)) {
    return nodes;
  }

  const providerTitle = resolveProviderTitle(last.providerId);
  nodes.push({
    id: `workflow:diagram_facades:session:${chain.rootSessionId}`,
    label: `Diagram Facades ${providerTitle}`,
    status: "active",
    visualDepth: 2,
    onSelect: () => {
      options.dispatchDialogOpenIntent({
        providerId: last.providerId,
        providerSessionId: last.providerSessionId,
        workspacePath,
        workspaceSlug,
        initiativeSlug: workspaceSlug,
        stage: "diagram_facades",
        sessionKind: "collector",
        runSlug: null,
      });
      // Sync: select the artifact for the same stage, or show DF placeholder
      if (options.diagramFacadesArtifactAvailable) {
        options.selectArtifact(dfArtifactPath, "facades-graph.mmd");
      } else {
        options.clearArtifactWithTool("Diagram Facades");
      }
    },
  });
  return nodes;
};
