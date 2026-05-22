import type React from "react";
import { ApplicationSkeletonHelp } from "../application-skeleton/application-skeleton-help";
import { ApplicationSkeletonPanel } from "../application-skeleton/application-skeleton-panel";
import { DiagramModulesHelp } from "../diagram-modules/diagram-modules-help";
import { DiagramModulesPanel } from "../diagram-modules/diagram-modules-panel";
import { QualityGatesHelp } from "../quality-gates/quality-gates-help";
import { QualityGatesPanel } from "../quality-gates/quality-gates-panel";
import { VirtualSimulationHelp } from "../virtual-simulation/virtual-simulation-help";
import { VirtualSimulationPanel } from "../virtual-simulation/virtual-simulation-panel";
import {
  APPLICATION_SKELETON_TOOL_LABEL,
  QUALITY_GATES_TOOL_LABEL,
  VIRTUAL_SIMULATION_TOOL_LABEL,
} from "./use-workflow-tool-select";
import type { ArtifactHeaderMode } from "./stage-artifact-mode";

const renderPanel = (
  Panel: React.FC<{
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly refreshKey?: number;
  }>,
  workspacePath: string | undefined,
  workspaceSlug: string | null,
  refreshKey?: number
): React.ReactNode =>
  workspacePath && workspaceSlug ? (
    <Panel
      refreshKey={refreshKey}
      workspacePath={workspacePath}
      workspaceSlug={workspaceSlug}
    />
  ) : (
    <div className="pm-placeholder">Выберите workspace, чтобы начать.</div>
  );

export const renderWorkflowStageHelp = (
  activeTool: string | null
): React.ReactNode | null => {
  if (activeTool === VIRTUAL_SIMULATION_TOOL_LABEL) return <VirtualSimulationHelp />;
  if (activeTool === "Diagram Modules") return <DiagramModulesHelp />;
  if (activeTool === APPLICATION_SKELETON_TOOL_LABEL) return <ApplicationSkeletonHelp />;
  if (activeTool === QUALITY_GATES_TOOL_LABEL) return <QualityGatesHelp />;
  return null;
};

export const renderWorkflowStagePanel = (params: {
  readonly activeTool: string | null;
  readonly headerMode: ArtifactHeaderMode;
  readonly workspacePath: string | undefined;
  readonly workspaceSlug: string | null;
  readonly refreshKey: number;
}): React.ReactNode | null => {
  if (params.activeTool === VIRTUAL_SIMULATION_TOOL_LABEL) {
    return renderPanel(VirtualSimulationPanel, params.workspacePath, params.workspaceSlug);
  }
  if (params.activeTool === "Diagram Modules") {
    return renderPanel(
      DiagramModulesPanel,
      params.workspacePath,
      params.workspaceSlug,
      params.refreshKey
    );
  }
  if (params.activeTool === APPLICATION_SKELETON_TOOL_LABEL) {
    return renderPanel(ApplicationSkeletonPanel, params.workspacePath, params.workspaceSlug);
  }
  if (params.activeTool === QUALITY_GATES_TOOL_LABEL) {
    return params.workspacePath && params.workspaceSlug ? (
      <QualityGatesPanel
        headerMode={params.headerMode}
        refreshKey={params.refreshKey}
        workspacePath={params.workspacePath}
        workspaceSlug={params.workspaceSlug}
      />
    ) : (
      <div className="pm-placeholder">Выберите workspace, чтобы начать.</div>
    );
  }
  return null;
};
