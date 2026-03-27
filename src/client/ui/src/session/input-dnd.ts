import { useEffect, useRef, useState } from "react";
import { DragDropFacade } from "../modules/drag-drop-module/drag-drop-facade";

interface InputDragDropOptions {
  readonly containerRef: React.RefObject<HTMLDivElement>;
  readonly onValueChange: (newValue: string) => void;
  readonly textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const DEFAULT_DRAG_OVERLAY_LABEL = "Drop files here while holding Shift";

export const useInputDragDrop = ({
  containerRef,
  textareaRef,
  onValueChange,
}: InputDragDropOptions) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragDropFacadeRef = useRef<DragDropFacade | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const textarea = textareaRef.current;
    if (!(container && textarea)) {
      return;
    }

    const dragDropFacade = new DragDropFacade();
    dragDropFacadeRef.current = dragDropFacade;

    dragDropFacade.initialize({
      container,
      onValueChange,
      getCurrentValue: () => textarea.value,
      onDragStateChange: setIsDragging,
    });

    return () => {
      dragDropFacade.destroy();
      dragDropFacadeRef.current = null;
    };
  }, [containerRef, onValueChange, textareaRef]);

  return { isDragging };
};
