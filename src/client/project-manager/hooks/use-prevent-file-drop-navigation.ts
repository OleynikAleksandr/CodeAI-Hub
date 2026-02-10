import { useEffect } from "react";

const hasFileDropPayload = (event: DragEvent): boolean => {
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }

  if (dataTransfer.files && dataTransfer.files.length > 0) {
    return true;
  }

  if (typeof dataTransfer.types === "undefined") {
    return false;
  }

  return Array.from(dataTransfer.types).includes("Files");
};

export const usePreventFileDropNavigation = (): void => {
  useEffect(() => {
    const handler = (event: DragEvent) => {
      if (event.shiftKey) {
        return;
      }

      if (!hasFileDropPayload(event)) {
        return;
      }

      // Prevent Chromium/CEF default behavior: replacing the SPA with the dropped file.
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("dragover", handler, true);
    document.addEventListener("drop", handler, true);

    return () => {
      document.removeEventListener("dragover", handler, true);
      document.removeEventListener("drop", handler, true);
    };
  }, []);
};

