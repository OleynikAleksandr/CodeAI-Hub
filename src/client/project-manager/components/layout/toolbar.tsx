import type React from "react";
import { SettingsIcon } from "../icons/settings-icon";

interface ToolbarProps {
  onSettingsClick?: () => void;
}

/**
 * Toolbar component (Section 3)
 * Height: 40px, Settings icon on the right
 */
export const Toolbar: React.FC<ToolbarProps> = ({ onSettingsClick }) => {
  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  return (
    <header className="pm-toolbar">
      <button
        aria-label="Open settings"
        className="pm-toolbar__settings"
        onClick={handleSettingsClick}
        title="Settings"
        type="button"
      >
        <SettingsIcon size={18} />
      </button>
    </header>
  );
};
