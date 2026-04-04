import type React from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";

const UI_LABELS_CATEGORY = "ui_interface";

interface StatusBarProps {
  workspaceName?: string;
}

/**
 * Section 7: Status Bar
 * Displays contextual info and system hints.
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  workspaceName,
}) => {
  const { t } = useLocalization();
  const workspaceLabel =
    workspaceName ??
    t(UI_LABELS_CATEGORY, "pm.status_bar.no_workspace_label", "No workspace");
  const contextLabel = t(
    UI_LABELS_CATEGORY,
    "pm.status_bar.context_label",
    "Context"
  );
  const workflowHintLabel = t(
    UI_LABELS_CATEGORY,
    "pm.status_bar.workflow_hint_label",
    "Workflow Tree MVP"
  );

  return (
    <footer className="pm-status-bar">
      <div className="pm-status-bar__left">
        <span className="pm-status-pill">{contextLabel}</span>
        <span className="pm-status-text">{workspaceLabel}</span>
      </div>
      <div className="pm-status-bar__right">
        <span className="pm-status-hint">{workflowHintLabel}</span>
      </div>
    </footer>
  );
};
