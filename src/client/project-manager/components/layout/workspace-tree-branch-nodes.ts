import { getDefaultProviderTitle } from "../../../../types/provider";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import { APPLICATION_FOUNDATION_ENVELOPE_TOOL_LABEL } from "./use-workflow-tool-select";
import type { SessionResumeIntent } from "./workspace-tree-auto-select";
import type { TreeNode } from "./workspace-tree-model";
import { resolveDiagramStageSyncPayload } from "./workspace-tree-diagram-branch-nodes";

export { buildDiagramModulesBranchNodes } from "./workspace-tree-diagram-branch-nodes";

const resolveProviderTitle = (providerId: string): string =>
  providerId === "claudeCodeCli" || providerId === "codexCli" || providerId === "geminiCli"
    ? getDefaultProviderTitle(providerId)
    : providerId;

const dispatchStageActivated = (stage: string): void => {
  window.dispatchEvent(
    new CustomEvent("pm:stage:activated", {
      detail: { stage, source: "workspace-tree-branch-node" },
    })
  );
};

const isCanonicalDescriptionPath = (path: string): boolean =>
  /\/description\/Final_Description\.md$/.test(path);

export const buildDescriptionBranchNodes = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly descriptionArtifactAvailable: boolean;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
  readonly selectArtifact: (artifactPath: string, label: string) => void;
  readonly dispatchDialogOpenIntent: (payload: SessionResumeIntent) => void;
}): readonly TreeNode[] => {
  const branch = options.workflowState?.description;
  if (!branch) {
    return [];
  }
  const session = branch.primarySession;
  const nodes: TreeNode[] = [];
  // Only show draftPath as Final_Description.md if it matches canonical contract
  const validDraftPath = branch.draftPath && isCanonicalDescriptionPath(branch.draftPath) ? branch.draftPath : null;
  const artifactPath = branch.finalPath ?? validDraftPath ?? branch.questionnairePath;
  const artifactLabel = branch.finalPath
    ? "Final_Description.md"
    : validDraftPath
      ? "Final_Description.md"
      : "questionnaire.md";
  const artifactStatus = branch.finalPath ? "active" : "draft";
  if (artifactPath) {
    nodes.push({
      id: "workflow:description:artifact",
      label: artifactLabel,
      title: artifactPath,
      status: artifactStatus,
      visualDepth: 2,
      onSelect: () => {
        dispatchStageActivated("description");
        options.selectArtifact(artifactPath, artifactLabel);
        // Sync: open the session for the same stage
        if (session && options.workspaceSlug && options.workspacePath) {
          options.dispatchDialogOpenIntent({
            providerId: session.providerId,
            providerSessionId: session.providerSessionId,
            workspacePath: options.workspacePath,
            workspaceSlug: options.workspaceSlug,
            initiativeSlug: options.workspaceSlug,
            stage: "description",
            sessionKind: "collector",
            runSlug: null,
          });
        }
      },
    });
  }
  if (session) {
    const providerTitle = resolveProviderTitle(session.providerId);
    const label = `Description ${providerTitle}`;
    nodes.push({
      id: "workflow:description:session",
      label,
      status: "active",
      visualDepth: 2,
      onSelect: () => {
        dispatchStageActivated("description");
        if (!(options.workspaceSlug && options.workspacePath)) {
          return;
        }
        options.dispatchDialogOpenIntent({
          providerId: session.providerId,
          providerSessionId: session.providerSessionId,
          workspacePath: options.workspacePath,
          workspaceSlug: options.workspaceSlug,
          initiativeSlug: options.workspaceSlug,
          stage: "description",
          sessionKind: "collector",
          runSlug: null,
        });
        // Sync: select the artifact for the same stage
        if (artifactPath) {
          options.selectArtifact(artifactPath, artifactLabel);
        }
      },
    });
  }
  return nodes;
};

const resolveLatestStageChain = (
  chains: WorkflowStateSnapshot["continuity"]["chains"],
  stage:
    | "virtual_simulation"
    | "diagram_modules"
    | "application_foundation_envelope"
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

export type StageSyncPayload = {
  readonly artifact: { readonly path: string; readonly label: string } | null;
  readonly clearTool: string | null;
  readonly session: SessionResumeIntent | null;
};

export const resolveStageSyncPayload = (options: {
  readonly stage: string;
  readonly workflowState: WorkflowStateSnapshot;
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly virtualSimulationArtifactAvailable: boolean;
  readonly diagramModulesArtifactAvailable?: boolean;
}): StageSyncPayload => {
  const { stage, workflowState, workspaceSlug, workspacePath } = options;

  if (stage === "description") {
    const branch = workflowState.description;
    if (!branch) return { artifact: null, clearTool: null, session: null };
    const validDraft = branch.draftPath && isCanonicalDescriptionPath(branch.draftPath) ? branch.draftPath : null;
    const artifactPath = branch.finalPath ?? validDraft ?? branch.questionnairePath;
    const artifactLabel = branch.finalPath
      ? "Final_Description.md"
      : validDraft
        ? "Final_Description.md"
        : "questionnaire.md";
    const session = branch.primarySession;
    return {
      artifact: artifactPath ? { path: artifactPath, label: artifactLabel } : null,
      clearTool: null,
      session:
        session
          ? {
              providerId: session.providerId,
              providerSessionId: session.providerSessionId,
              workspacePath,
              workspaceSlug,
              initiativeSlug: workspaceSlug,
              stage: "description",
              sessionKind: "collector",
              runSlug: null,
            }
          : null,
    };
  }

  if (stage === "virtual_simulation") {
    const chain = resolveLatestStageChain(workflowState.continuity.chains, "virtual_simulation");
    const last = chain?.segments.at(-1) ?? null;
    const vsArtifactPath = `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`;
    return {
      artifact: options.virtualSimulationArtifactAvailable
        ? { path: vsArtifactPath, label: "virtual-simulation.md" }
        : null,
      clearTool: options.virtualSimulationArtifactAvailable ? null : "VIRTUAL SIMULATION",
      session: last
        ? {
            providerId: last.providerId,
            providerSessionId: last.providerSessionId,
            workspacePath,
            workspaceSlug,
            initiativeSlug: workspaceSlug,
            stage: "virtual_simulation",
            sessionKind: "collector",
            runSlug: null,
          }
        : null,
    };
  }

  if (stage === "diagram_modules") {
    return resolveDiagramStageSyncPayload({
      stage,
      workflowState,
      workspaceSlug,
      workspacePath,
      diagramModulesArtifactAvailable: options.diagramModulesArtifactAvailable,
    });
  }

  if (stage === "application_foundation_envelope") {
    const chain = resolveLatestStageChain(
      workflowState.continuity.chains,
      "application_foundation_envelope"
    );
    const last = chain?.segments.at(-1) ?? null;
    return {
      artifact: null,
      clearTool: APPLICATION_FOUNDATION_ENVELOPE_TOOL_LABEL,
      session: last
        ? {
            providerId: last.providerId,
            providerSessionId: last.providerSessionId,
            workspacePath,
            workspaceSlug,
            initiativeSlug: workspaceSlug,
            stage: "application_foundation_envelope",
            sessionKind: "collector",
            runSlug: null,
          }
        : null,
    };
  }

  return { artifact: null, clearTool: null, session: null };
};

export const buildVirtualSimulationBranchNodes = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly virtualSimulationArtifactAvailable: boolean;
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
  const vsArtifactPath = `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`;

  const chain = resolveLatestStageChain(
    workflowState.continuity.chains,
    "virtual_simulation"
  );
  const last = chain?.segments.at(-1) ?? null;

  if (options.virtualSimulationArtifactAvailable) {
    nodes.push({
      id: "workflow:virtual_simulation:artifact",
      label: "virtual-simulation.md",
      title: vsArtifactPath,
      status: "active",
      visualDepth: 2,
      onSelect: () => {
        dispatchStageActivated("virtual_simulation");
        options.selectArtifact(vsArtifactPath, "virtual-simulation.md");
        // Sync: open the session for the same stage
        if (last) {
          options.dispatchDialogOpenIntent({
            providerId: last.providerId,
            providerSessionId: last.providerSessionId,
            workspacePath,
            workspaceSlug,
            initiativeSlug: workspaceSlug,
            stage: "virtual_simulation",
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
      id: `workflow:virtual_simulation:session:${chain.rootSessionId}`,
      label: `Virtual Simulation ${providerTitle}`,
      status: "active",
      visualDepth: 2,
      onSelect: () => {
        dispatchStageActivated("virtual_simulation");
        options.dispatchDialogOpenIntent({
          providerId: last.providerId,
          providerSessionId: last.providerSessionId,
          workspacePath,
          workspaceSlug,
          initiativeSlug: workspaceSlug,
          stage: "virtual_simulation",
          sessionKind: "collector",
          runSlug: null,
        });
        // Sync: select the artifact for the same stage, or show VS placeholder
        if (options.virtualSimulationArtifactAvailable) {
          options.selectArtifact(vsArtifactPath, "virtual-simulation.md");
        } else {
          options.clearArtifactWithTool("VIRTUAL SIMULATION");
        }
      },
    });
  return nodes;
};

export const buildApplicationFoundationEnvelopeBranchNodes = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
  readonly dispatchDialogOpenIntent: (payload: SessionResumeIntent) => void;
  readonly clearArtifactWithTool: (activeTool: string) => void;
}): readonly TreeNode[] => {
  const workflowState = options.workflowState;
  const workspaceSlug = options.workspaceSlug;
  const workspacePath = options.workspacePath;

  if (!(workflowState && workspaceSlug && workspacePath)) {
    return [];
  }

  const chain = resolveLatestStageChain(
    workflowState.continuity.chains,
    "application_foundation_envelope"
  );
  const last = chain?.segments.at(-1) ?? null;

  if (!(chain && last)) {
    return [];
  }

  const providerTitle = resolveProviderTitle(last.providerId);
  return [
    {
      id: `workflow:application_foundation_envelope:session:${chain.rootSessionId}`,
      label: `Application Foundation Envelope ${providerTitle}`,
      status: "active",
      visualDepth: 2,
      onSelect: () => {
        dispatchStageActivated("application_foundation_envelope");
        options.dispatchDialogOpenIntent({
          providerId: last.providerId,
          providerSessionId: last.providerSessionId,
          workspacePath,
          workspaceSlug,
          initiativeSlug: workspaceSlug,
          stage: "application_foundation_envelope",
          sessionKind: "collector",
          runSlug: null,
        });
        options.clearArtifactWithTool(
          APPLICATION_FOUNDATION_ENVELOPE_TOOL_LABEL
        );
      },
    },
  ];
};
