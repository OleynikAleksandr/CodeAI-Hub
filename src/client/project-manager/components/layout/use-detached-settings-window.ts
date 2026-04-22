import { useEffect, useRef } from "react";

const SETTINGS_WINDOW_EVENT = "pm:settings:open";
const SETTINGS_WINDOW_FEATURES = "popup";

const buildDetachedSettingsUrl = (): string => {
  const base = window.location.href.split("?")[0];
  const params = new URLSearchParams({
    mode: "detached-settings",
  });
  return `${base}?${params.toString()}`;
};

const openDetachedSettingsWindow = (
  currentWindow: Window | null
): Window | null => {
  if (currentWindow && !currentWindow.closed) {
    currentWindow.focus();
    return currentWindow;
  }
  return window.open(
    buildDetachedSettingsUrl(),
    "_blank",
    SETTINGS_WINDOW_FEATURES
  );
};

export const useDetachedSettingsWindow = (): void => {
  const detachedWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    const handleOpen = () => {
      detachedWindowRef.current = openDetachedSettingsWindow(
        detachedWindowRef.current
      );
    };

    window.addEventListener(SETTINGS_WINDOW_EVENT, handleOpen);
    return () => {
      window.removeEventListener(SETTINGS_WINDOW_EVENT, handleOpen);
    };
  }, []);
};
