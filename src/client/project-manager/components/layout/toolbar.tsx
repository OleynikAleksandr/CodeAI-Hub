import type React from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { WORKFLOW_LABELS } from "./workspace-tree-model";

const UI_LABELS_CATEGORY = "ui_interface";

interface ToolbarProps {
  tools: readonly string[];
  activeTool?: string;
  onToolSelect?: (tool: string) => void;
}

/**
 * Tool palette (Section 3)
 * Displays contextual workflow tools.
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  tools,
  activeTool,
  onToolSelect,
}) => {
  const { t } = useLocalization();

  const resolveToolLabel = (tool: string): string => {
    switch (tool) {
      case WORKFLOW_LABELS.description:
        return t(
          UI_LABELS_CATEGORY,
          "pm.workflow.stage.description.label",
          WORKFLOW_LABELS.description
        );
      case WORKFLOW_LABELS.virtual_simulation:
        return t(
          UI_LABELS_CATEGORY,
          "pm.workflow.stage.virtual_simulation.label",
          WORKFLOW_LABELS.virtual_simulation
        );
      case WORKFLOW_LABELS.diagram_modules:
        return t(
          UI_LABELS_CATEGORY,
          "pm.workflow.stage.diagram_modules.label",
          WORKFLOW_LABELS.diagram_modules
        );
      case WORKFLOW_LABELS.application_foundation_envelope:
        return t(
          UI_LABELS_CATEGORY,
          "pm.workflow.stage.application_foundation_envelope.label",
          WORKFLOW_LABELS.application_foundation_envelope
        );
      default:
        return tool;
    }
  };

  return (
    <header className="pm-tool-palette">
      <div className="pm-tool-palette__track">
        {tools.map((tool) => {
          const isActive = tool === activeTool;
          return (
            <button
              className={isActive ? "pm-tool pm-tool--active" : "pm-tool"}
              key={tool}
              onClick={() => onToolSelect?.(tool)}
              type="button"
            >
              <span className="pm-tool__label">{resolveToolLabel(tool)}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
