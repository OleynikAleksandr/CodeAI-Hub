import type React from "react";
import { useCallback, useRef } from "react";
import { VerticalResizer } from "../resizer/vertical-resizer";

interface PanelContainerProps {
  sizes: [number, number, number];
  onSizeChange: (index: 0 | 1, delta: number, containerWidth: number) => void;
}

/**
 * Panel container component (Sections 4, 5, 6)
 * Three resizable panels with draggable dividers
 */
export const PanelContainer: React.FC<PanelContainerProps> = ({
  sizes,
  onSizeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback(
    (index: 0 | 1, deltaX: number) => {
      const containerWidth = containerRef.current?.offsetWidth ?? 0;
      onSizeChange(index, deltaX, containerWidth);
    },
    [onSizeChange]
  );

  return (
    <div className="pm-panel-container" ref={containerRef}>
      {/* Panel 4 (Section 4) */}
      <div className="pm-panel" style={{ width: `${sizes[0]}%` }}>
        <div className="pm-panel__header">Section 4</div>
        <div className="pm-panel__content">{/* Future: Panel 4 content */}</div>
      </div>

      <VerticalResizer index={0} onResize={handleResize} />

      {/* Panel 5 (Section 5) */}
      <div className="pm-panel" style={{ width: `${sizes[1]}%` }}>
        <div className="pm-panel__header">Section 5</div>
        <div className="pm-panel__content">{/* Future: Panel 5 content */}</div>
      </div>

      <VerticalResizer index={1} onResize={handleResize} />

      {/* Panel 6 (Section 6) */}
      <div className="pm-panel" style={{ width: `${sizes[2]}%` }}>
        <div className="pm-panel__header">Section 6</div>
        <div className="pm-panel__content">{/* Future: Panel 6 content */}</div>
      </div>
    </div>
  );
};
