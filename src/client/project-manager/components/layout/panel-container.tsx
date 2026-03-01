import type React from "react";
import { useCallback, useRef } from "react";
import { VerticalResizer } from "../resizer/vertical-resizer";

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
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback(
    (_index: number, deltaX: number) => {
      const containerWidth = containerRef.current?.offsetWidth ?? 0;
      onSizeChange(0, deltaX, containerWidth);
    },
    [onSizeChange]
  );

  return (
    <div className="pm-panel-container" ref={containerRef}>
      <section className="pm-panel pm-panel--sessions" style={{ width: `${sizes[0]}%` }}>
        <div className="pm-panel__header">{sessionHeaderContent ?? "Sessions"}</div>
        <div className="pm-panel__content">
          {sessionContent ?? (
            <div className="pm-placeholder">Session windows will appear here.</div>
          )}
        </div>
      </section>

      <VerticalResizer index={0} onResize={handleResize} />

      <section className="pm-panel pm-panel--artifacts" style={{ width: `${sizes[1]}%` }}>
        <div className="pm-panel__header">{artifactHeaderContent ?? "Artifacts"}</div>
        <div className="pm-panel__content">
          {artifactContent ?? (
            <div className="pm-placeholder">Artifacts will appear here.</div>
          )}
        </div>
      </section>
    </div>
  );
};
