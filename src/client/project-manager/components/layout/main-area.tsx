import type React from "react";
import { PanelContainer } from "./panel-container";
import { StatusBar } from "./status-bar";
import { Toolbar } from "./toolbar";

interface MainAreaProps {
  sizes: [number, number, number];
  onSizeChange: (index: 0 | 1, delta: number, containerWidth: number) => void;
}

/**
 * Main area component (Section 2)
 * Contains Toolbar (Section 3), PanelContainer (Sections 4, 5, 6), and StatusBar (Section 7)
 */
export const MainArea: React.FC<MainAreaProps> = ({ sizes, onSizeChange }) => {
  const handleSettingsClick = () => {
    // Future: Open settings modal/panel
  };

  return (
    <main className="pm-main-area">
      <Toolbar onSettingsClick={handleSettingsClick} />
      <PanelContainer onSizeChange={onSizeChange} sizes={sizes} />
      <StatusBar />
    </main>
  );
};
