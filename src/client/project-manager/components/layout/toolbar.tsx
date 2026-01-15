import type React from "react";

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
}) => (
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
            <span className="pm-tool__label">{tool}</span>
          </button>
        );
      })}
    </div>
  </header>
);
