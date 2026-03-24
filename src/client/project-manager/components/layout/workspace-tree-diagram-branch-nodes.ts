import { getDefaultProviderTitle } from "../../../../types/provider";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import type { SessionResumeIntent } from "./workspace-tree-auto-select";
import type { StageSyncPayload } from "./workspace-tree-branch-nodes";
import {
  WORKFLOW_STAGE_BLOCKED_TITLES,
  WORKFLOW_STAGE_OUTDATED_TITLE,
  resolveTreeStatus,
  type TreeNode,
} from "./workspace-tree-model";

const resolveProviderTitle = (providerId: string): string =>
  providerId === "claudeCodeCli" || providerId === "codexCli" || providerId === "geminiCli"
    ? getDefaultProviderTitle(providerId)
    : providerId;

const dispatchStageActivated = (stage: string): void => {
  window.dispatchEvent(
    new CustomEvent("pm:stage:activated", {
      detail: { stage, source: "workspace-tree-diagram-branch-node" },
    })
  );
};

const resolveLatestDiagramChain = (
  chains: WorkflowStateSnapshot["continuity"]["chains"],
  stage: "diagram_modules"
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

const resolveDiagramNodeVisuals = (
  workflowState: WorkflowStateSnapshot,
  stage: "diagram_modules"
): { readonly status: TreeNode["status"]; readonly title?: string } => {
  const status = workflowState.stages[stage] ?? "idle";
  const blocked = workflowState.gating.blocked[stage] ?? false;
  return {
    status: resolveTreeStatus(status, blocked),
    title:
      status === "outdated"
        ? WORKFLOW_STAGE_OUTDATED_TITLE
        : blocked
          ? WORKFLOW_STAGE_BLOCKED_TITLES[stage]
          : undefined,
  };
};

const buildSessionIntent = (params: {
  readonly last: NonNullable<
    ReturnType<typeof resolveLatestDiagramChain>
  >["segments"][number];
  readonly stage: "diagram_modules";
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): SessionResumeIntent => ({
  providerId: params.last.providerId,
  providerSessionId: params.last.providerSessionId,
  workspacePath: params.workspacePath,
  workspaceSlug: params.workspaceSlug,
  initiativeSlug: params.workspaceSlug,
  stage: params.stage,
  sessionKind: "collector",
  runSlug: null,
});

export const resolveDiagramStageSyncPayload = (options: {
  readonly stage: "diagram_modules";
  readonly workflowState: WorkflowStateSnapshot;
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly diagramModulesArtifactAvailable?: boolean;
}): StageSyncPayload => {
  const { workflowState, workspaceSlug, workspacePath } = options;

  const chain = resolveLatestDiagramChain(workflowState.continuity.chains, "diagram_modules");
  const last = chain?.segments.at(-1) ?? null;
  const dmArtifactPath = `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`;
  const available = options.diagramModulesArtifactAvailable ?? false;
  return {
    artifact: available ? { path: dmArtifactPath, label: "Module Graph" } : null,
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
  const dmArtifactPath = `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`;
  const nodeVisuals = resolveDiagramNodeVisuals(workflowState, "diagram_modules");

  const chain = resolveLatestDiagramChain(
    workflowState.continuity.chains,
    "diagram_modules"
  );
  const last = chain?.segments.at(-1) ?? null;

  if (options.diagramModulesArtifactAvailable) {
    nodes.push({
      id: "workflow:diagram_modules:artifact",
      label: "Module Graph",
      title: nodeVisuals.title
        ? `${dmArtifactPath}\n${nodeVisuals.title}`
        : dmArtifactPath,
      status: nodeVisuals.status,
      visualDepth: 2,
      onSelect: () => {
        dispatchStageActivated("diagram_modules");
        options.selectArtifact(dmArtifactPath, "Module Graph");
        if (last) {
          options.dispatchDialogOpenIntent(
            buildSessionIntent({
              last,
              workspacePath,
              workspaceSlug,
              stage: "diagram_modules",
            })
          );
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
    status: nodeVisuals.status,
    title: nodeVisuals.title,
    visualDepth: 2,
    onSelect: () => {
      dispatchStageActivated("diagram_modules");
      options.dispatchDialogOpenIntent(
        buildSessionIntent({
          last,
          workspacePath,
          workspaceSlug,
          stage: "diagram_modules",
        })
      );
      if (options.diagramModulesArtifactAvailable) {
        options.selectArtifact(dmArtifactPath, "Module Graph");
      } else {
        options.clearArtifactWithTool("Diagram Modules");
      }
    },
  });
  return nodes;
};
