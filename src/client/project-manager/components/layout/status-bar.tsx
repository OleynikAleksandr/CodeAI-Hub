import type React from "react";

/**
 * Section 7: Status Bar
 * Displays background processes, version, etc.
 */
export const StatusBar: React.FC = () => {
  return (
    <footer className="pm-status-bar">
      <div className="pm-status-bar__left">
        <span>Ready</span>
      </div>
      <div className="pm-status-bar__right">
        <span>v1.1.352</span>
      </div>
    </footer>
  );
};
