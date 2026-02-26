import { getDefaultProviderTitle } from "../../../../types/provider";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import type { SessionResumeIntent } from "./workspace-tree-auto-select";
import type { TreeNode } from "./workspace-tree-model";

const resolveProviderTitle = (providerId: string): string =>
  providerId === "claudeCodeCli" || providerId === "codexCli" || providerId === "geminiCli"
    ? getDefaultProviderTitle(providerId)
    : providerId;

export const buildDescriptionBranchNodes = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
  readonly selectArtifact: (artifactPath: string, label: string) => void;
  readonly dispatchDialogOpenIntent: (payload: SessionResumeIntent) => void;
}): readonly TreeNode[] => {
  const branch = options.workflowState?.description;
  if (!branch) {
    return [];
  }
  const session = branch.session;
  const nodes: TreeNode[] = [];
  const artifactPath = branch.finalPath ?? branch.draftPath ?? branch.questionnairePath;
  const artifactLabel = branch.finalPath
    ? "Final_Description.md"
    : branch.draftPath
      ? "description.md"
      : "questionnaire.md";
  const artifactStatus = branch.finalPath ? "active" : "draft";
  const isReviewerSession = branch.sessionKind === "reviewer" || Boolean(branch.finalPath);
  const isTerminalCollector = !isReviewerSession && Boolean(branch.draftPath);
  if (artifactPath) {
    nodes.push({
      id: "workflow:description:artifact",
      label: artifactLabel,
      title: artifactPath,
      status: artifactStatus,
      visualDepth: 2,
      onSelect: () => {
        options.selectArtifact(artifactPath, artifactLabel);
        // Sync: open the session for the same stage
        if (session && !isTerminalCollector && options.workspaceSlug && options.workspacePath) {
          options.dispatchDialogOpenIntent({
            providerId: session.providerId,
            providerSessionId: session.providerSessionId,
            workspacePath: options.workspacePath,
            workspaceSlug: options.workspaceSlug,
            initiativeSlug: options.workspaceSlug,
            stage: "description",
            sessionKind: isReviewerSession ? "reviewer" : "collector",
            runSlug: isReviewerSession ? "reviewer" : null,
          });
        }
      },
    });
  }
  if (session) {
    const providerTitle = resolveProviderTitle(session.providerId);
    const label = isReviewerSession
      ? `Reviewer ${providerTitle}`
      : `Description ${providerTitle}${isTerminalCollector ? " (read-only)" : ""}`;
    const runSlug = isReviewerSession ? "reviewer" : null;
    nodes.push({
      id: "workflow:description:session",
      label,
      status: isTerminalCollector ? "blocked" : "active",
      visualDepth: 2,
      onSelect: isTerminalCollector
        ? undefined
        : () => {
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
              sessionKind: isReviewerSession ? "reviewer" : "collector",
              runSlug,
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
  stage: "virtual_simulation"
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

export const buildVirtualSimulationBranchNodes = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly virtualSimulationArtifactAvailable: boolean;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
  readonly selectArtifact: (artifactPath: string, label: string) => void;
  readonly dispatchDialogOpenIntent: (payload: SessionResumeIntent) => void;
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
        // Sync: select the artifact for the same stage
        if (options.virtualSimulationArtifactAvailable) {
          options.selectArtifact(vsArtifactPath, "virtual-simulation.md");
        }
      },
    });
  return nodes;
};
