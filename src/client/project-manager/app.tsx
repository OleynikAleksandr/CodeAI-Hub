import type React from "react";
import { MainLayout } from "./components/layout/main-layout";
import { usePreventFileDropNavigation } from "./hooks/use-prevent-file-drop-navigation";

/**
 * Project Manager root application component
 */
export const App: React.FC = () => {
  usePreventFileDropNavigation();

  return (
    <div className="pm-workbench">
      <MainLayout />
    </div>
  );
};
