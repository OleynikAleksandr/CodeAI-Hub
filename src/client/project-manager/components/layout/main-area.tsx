import type React from "react";
import { useState } from "react";
import { PanelContainer } from "./panel-container";
import { StatusBar } from "./status-bar";
import { Toolbar } from "./toolbar";

interface MainAreaProps {
  sizes: [number, number];
  onSizeChange: (index: 0, delta: number, containerWidth: number) => void;
  activeWorkspaceName?: string;
  activeInitiativeName?: string;
}

/**
 * Main area component (Section 2)
 * Contains Toolbar (Section 3), PanelContainer (Sections 4, 5, 6), and StatusBar (Section 7)
 */
export const MainArea: React.FC<MainAreaProps> = ({
  sizes,
  onSizeChange,
  activeWorkspaceName,
  activeInitiativeName,
}) => {
  const tools = ["Description", "Diagrams", "Spec", "Plan", "Execute"];
  const [activeTool, setActiveTool] = useState<string>(tools[0] ?? "Description");

  return (
    <main className="pm-main-area">
      <Toolbar activeTool={activeTool} onToolSelect={setActiveTool} tools={tools} />
      <PanelContainer
        onSizeChange={onSizeChange}
        sizes={sizes}
      />
      <StatusBar
        initiativeName={activeInitiativeName}
        workspaceName={activeWorkspaceName}
      />
    </main>
  );
};
