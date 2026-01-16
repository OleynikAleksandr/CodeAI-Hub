import type React from "react";
import { useState } from "react";
import { PanelContainer } from "./panel-container";
import { StatusBar } from "./status-bar";
import { Toolbar } from "./toolbar";

interface MainAreaProps {
  sizes: [number, number];
  onSizeChange: (index: 0, delta: number, containerWidth: number) => void;
  activeWorkspaceName?: string;
}

/**
 * Main area component (Section 2)
 * Contains Toolbar (Section 3), PanelContainer (Sections 4, 5, 6), and StatusBar (Section 7)
 */
export const MainArea: React.FC<MainAreaProps> = ({
  sizes,
  onSizeChange,
  activeWorkspaceName,
}) => {
  // NOTE (MVP): Tool palette will be driven by the selected node in the real Workflow Tree
  // (gated by artifacts/status). The static tool list was only used during early layout work
  // and is intentionally disabled to avoid implying functionality that isn't wired yet.
  //
  // const tools = ["Description", "Diagrams", "Spec", "Plan", "Execute"] as const;
  const tools: readonly string[] = [];
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);

  return (
    <main className="pm-main-area">
      <Toolbar activeTool={activeTool} onToolSelect={setActiveTool} tools={tools} />
      <PanelContainer
        onSizeChange={onSizeChange}
        sizes={sizes}
      />
      <StatusBar
        workspaceName={activeWorkspaceName}
      />
    </main>
  );
};
