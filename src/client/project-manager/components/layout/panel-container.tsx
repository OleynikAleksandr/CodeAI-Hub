import type React from "react";
import { useCallback, useRef } from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { VerticalResizer } from "../resizer/vertical-resizer";

const UI_LABELS_CATEGORY = "ui_interface";

interface PanelContainerProps {
  sizes: [number, number];
  onSizeChange: (index: 0, delta: number, containerWidth: number) => void;
  sessionContent?: React.ReactNode;
  artifactContent?: React.ReactNode;
  sessionHeaderContent?: React.ReactNode;
  artifactHeaderContent?: React.ReactNode;
}

/**
 * Panel container component (Sessions + Artifacts)
 * Two resizable panels with a draggable divider
 */
export const PanelContainer: React.FC<PanelContainerProps> = ({
  sizes,
  onSizeChange,
  sessionContent,
  artifactContent,
  sessionHeaderContent,
  artifactHeaderContent,
}) => {
  const { t } = useLocalization();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback(
    (_index: number, deltaX: number) => {
      const containerWidth = containerRef.current?.offsetWidth ?? 0;
      onSizeChange(0, deltaX, containerWidth);
    },
    [onSizeChange]
  );

  const sessionsHeaderLabel = t(
    UI_LABELS_CATEGORY,
    "pm.panel_container.sessions_header",
    "Sessions"
  );
  const artifactsHeaderLabel = t(
    UI_LABELS_CATEGORY,
    "pm.panel_container.artifacts_header",
    "Artifacts"
  );
  const sessionsPlaceholderLabel = t(
    UI_LABELS_CATEGORY,
    "pm.panel_container.sessions_placeholder",
    "Session windows will appear here."
  );
  const artifactsPlaceholderLabel = t(
    UI_LABELS_CATEGORY,
    "pm.panel_container.artifacts_placeholder",
    "Artifacts will appear here."
  );

  return (
    <div className="pm-panel-container" ref={containerRef}>
      <section className="pm-panel pm-panel--sessions" style={{ width: `${sizes[0]}%` }}>
        <div className="pm-panel__header">
          {sessionHeaderContent ?? sessionsHeaderLabel}
        </div>
        <div className="pm-panel__content">
          {sessionContent ?? (
            <div className="pm-placeholder">{sessionsPlaceholderLabel}</div>
          )}
        </div>
      </section>

      <VerticalResizer index={0} onResize={handleResize} />

      <section className="pm-panel pm-panel--artifacts" style={{ width: `${sizes[1]}%` }}>
        <div className="pm-panel__header">
          {artifactHeaderContent ?? artifactsHeaderLabel}
        </div>
        <div className="pm-panel__content">
          {artifactContent ?? (
            <div className="pm-placeholder">{artifactsPlaceholderLabel}</div>
          )}
        </div>
      </section>
    </div>
  );
};
