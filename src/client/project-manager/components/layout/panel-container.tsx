import type React from "react";
import { useCallback, useRef } from "react";
import type { WorkspaceProject } from "../../types";
import { VerticalResizer } from "../resizer/vertical-resizer";

interface PanelContainerProps {
  sizes: [number, number, number];
  onSizeChange: (index: 0 | 1, delta: number, containerWidth: number) => void;
  activeProject?: WorkspaceProject;
}

/**
 * Panel container component (Sections 4, 5, 6)
 * Three resizable panels with draggable dividers
 */
export const PanelContainer: React.FC<PanelContainerProps> = ({
  sizes,
  onSizeChange,
  activeProject,
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
      {/* Panel 4 (Overview) */}
      <div className="pm-panel" style={{ width: `${sizes[0]}%` }}>
        <div className="pm-panel__header">Overview</div>
        <div className="pm-panel__content">
          {activeProject ? (
            <div className="pm-details">
              <h2 className="pm-details__title">{activeProject.name}</h2>
              <p className="pm-details__path">{activeProject.path}</p>
            </div>
          ) : (
            <div className="pm-placeholder">Select a workspace to see details</div>
          )}
        </div>
      </div>

      <VerticalResizer index={0} onResize={handleResize} />

      {/* Panel 5 (Details) */}
      <div className="pm-panel" style={{ width: `${sizes[1]}%` }}>
        <div className="pm-panel__header">Details</div>
        <div className="pm-panel__content">
          {activeProject && (
            <div className="pm-details-list">
              <div className="pm-details-item">
                <span className="pm-details-item__label">Last Used:</span>
                <span className="pm-details-item__value">
                  {new Date(activeProject.lastUsed).toLocaleString()}
                </span>
              </div>
              <div className="pm-details-item">
                <span className="pm-details-item__label">Project ID:</span>
                <span className="pm-details-item__value">{activeProject.id}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <VerticalResizer index={1} onResize={handleResize} />

      {/* Panel 6 (Stats) */}
      <div className="pm-panel" style={{ width: `${sizes[2]}%` }}>
        <div className="pm-panel__header">Sessions</div>
        <div className="pm-panel__content">
          <div className="pm-placeholder">No active sessions for this workspace</div>
        </div>
      </div>
    </div>
  );
};
