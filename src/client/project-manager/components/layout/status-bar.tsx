import type React from "react";

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
  const workspaceLabel = workspaceName ?? "No workspace";

  return (
    <footer className="pm-status-bar">
      <div className="pm-status-bar__left">
        <span className="pm-status-pill">Context</span>
        <span className="pm-status-text">{workspaceLabel}</span>
      </div>
      <div className="pm-status-bar__right">
        <span className="pm-status-hint">Workflow Tree MVP</span>
      </div>
    </footer>
  );
};
