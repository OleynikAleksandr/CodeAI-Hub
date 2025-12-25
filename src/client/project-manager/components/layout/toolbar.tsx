import type React from "react";
import { SettingsIcon } from "../icons/settings-icon";

interface ToolbarProps {
  onSettingsClick?: () => void;
  title?: string;
}

/**
 * Toolbar component (Section 3)
 * Displays title and settings icon in VS Code style
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  onSettingsClick,
  title = "Project Manager",
}) => {
  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  return (
    <header className="pm-toolbar">
      <div className="pm-toolbar__title-group">
        <h1 className="pm-toolbar__title">{title}</h1>
        <button
          aria-label="Open settings"
          className="pm-toolbar__settings"
          onClick={handleSettingsClick}
          title="Settings"
          type="button"
        >
          <SettingsIcon size={16} />
        </button>
      </div>
      <div className="pm-toolbar__actions">
        {/* Future: Other header actions */}
      </div>
    </header>
  );
};
