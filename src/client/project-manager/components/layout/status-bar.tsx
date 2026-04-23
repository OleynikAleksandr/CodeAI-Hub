import type React from "react";
import { useEffect, useState } from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";

const UI_LABELS_CATEGORY = "ui_interface";

const openProjectManagerSettings = (): void => {
  window.dispatchEvent(new CustomEvent("pm:settings:open"));
};

const useDiagramZoom = (): { zoom: number; reset: () => void } => {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const handler = (e: Event) => {
      const z = (e as CustomEvent<{ readonly zoom: number }>).detail?.zoom;
      if (typeof z === "number") setZoom(z);
    };
    window.addEventListener("pm:diagram:zoom", handler);
    return () => window.removeEventListener("pm:diagram:zoom", handler);
  }, []);
  const reset = () => {
    window.dispatchEvent(new CustomEvent("pm:diagram:zoom:reset"));
  };
  return { zoom, reset };
};

/**
 * Section 7: Status Bar
 * Displays contextual info and system hints.
 */
export const StatusBar: React.FC = () => {
  const { t } = useLocalization();
  const { zoom, reset: resetZoom } = useDiagramZoom();
  const workflowHintLabel = t(
    UI_LABELS_CATEGORY,
    "pm.status_bar.workflow_hint_label",
    "Workflow Tree MVP"
  );
  const openSettingsLabel = t(
    UI_LABELS_CATEGORY,
    "pm.status_bar.open_settings_label",
    "Open Settings"
  );

  return (
    <footer className="pm-status-bar">
      <div className="pm-status-bar__right">
        {zoom !== 1 && (
          <button
            className="pm-status-zoom"
            type="button"
            onClick={resetZoom}
          >
            {Math.round(zoom * 100)}% · reset
          </button>
        )}
        <span className="pm-status-hint">{workflowHintLabel}</span>
        <button
          className="pm-status-open-settings"
          type="button"
          onClick={openProjectManagerSettings}
        >
          {openSettingsLabel}
        </button>
      </div>
    </footer>
  );
};
