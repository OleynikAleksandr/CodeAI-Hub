import type React from "react";
import { MainLayout } from "./components/layout/main-layout";

/**
 * Project Manager root application component
 */
export const App: React.FC = () => (
  <div className="pm-workbench">
    <MainLayout />
  </div>
);
