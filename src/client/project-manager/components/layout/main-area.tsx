import type React from "react";
import { useEffect, useState } from "react";
import type { WorkspaceProject } from "../../types";
import { DescriptionQuestionnairePanel } from "../description/description-questionnaire-panel";
import { PanelContainer } from "./panel-container";
import { StatusBar } from "./status-bar";
import { Toolbar } from "./toolbar";

interface MainAreaProps {
  sizes: [number, number];
  onSizeChange: (index: 0, delta: number, containerWidth: number) => void;
  activeWorkspace?: WorkspaceProject;
}

/**
 * Main area component (Section 2)
 * Contains Toolbar (Section 3), PanelContainer (Sections 4, 5, 6), and StatusBar (Section 7)
 */
export const MainArea: React.FC<MainAreaProps> = ({
  sizes,
  onSizeChange,
  activeWorkspace,
}) => {
  const tools: readonly string[] = activeWorkspace ? ["Description"] : [];
  const [activeTool, setActiveTool] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) {
      setActiveTool(null);
      return;
    }
    setActiveTool((current) => current ?? "Description");
  }, [activeWorkspace?.id]);

  const showDescriptionQuestionnaire = activeTool === "Description";

  return (
    <main className="pm-main-area">
      <Toolbar
        activeTool={activeTool ?? undefined}
        onToolSelect={setActiveTool}
        tools={tools}
      />
      {showDescriptionQuestionnaire ? (
        <div className="pm-panel-container">
          <div className="pm-panel__content">
            <DescriptionQuestionnairePanel
              onClose={() => setActiveTool(null)}
              workspaceName={activeWorkspace?.name}
              workspacePath={activeWorkspace?.path}
            />
          </div>
        </div>
      ) : (
        <PanelContainer onSizeChange={onSizeChange} sizes={sizes} />
      )}
      <StatusBar
        workspaceName={activeWorkspace?.name}
      />
    </main>
  );
};
