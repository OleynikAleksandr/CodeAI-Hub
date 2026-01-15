import type React from "react";
import { useCallback, useRef, useState } from "react";

interface VerticalResizerProps {
  index: number;
  onResize: (index: number, deltaX: number) => void;
}

/**
 * Vertical resizer component for dragging between panels
 */
export const VerticalResizer: React.FC<VerticalResizerProps> = ({
  index,
  onResize,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startXRef.current;
        if (deltaX !== 0) {
          onResize(index, deltaX);
          startXRef.current = moveEvent.clientX;
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [index, onResize]
  );

  const className = isDragging ? "pm-resizer pm-resizer--active" : "pm-resizer";

  return (
    <div
      aria-label={`Resize panels ${index + 1} and ${index + 2}`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={50}
      className={className}
      onMouseDown={handleMouseDown}
      role="slider"
      tabIndex={0}
      title={`Drag to resize panels ${index + 1} and ${index + 2}`}
    />
  );
};
