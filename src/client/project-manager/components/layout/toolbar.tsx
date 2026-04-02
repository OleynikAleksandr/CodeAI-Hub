import type React from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { WORKFLOW_LABELS } from "./workspace-tree-model";

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
          "workflow_terms",
          "pm.workflow.stage.description.label",
          WORKFLOW_LABELS.description
        );
      case WORKFLOW_LABELS.virtual_simulation:
        return t(
          "workflow_terms",
          "pm.workflow.stage.virtual_simulation.label",
          WORKFLOW_LABELS.virtual_simulation
        );
      case WORKFLOW_LABELS.diagram_modules:
        return t(
          "workflow_terms",
          "pm.workflow.stage.diagram_modules.label",
          WORKFLOW_LABELS.diagram_modules
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
