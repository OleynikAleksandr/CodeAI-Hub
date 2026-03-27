import { useCallback, useState } from "react";
import { postVsCodeMessage } from "../vscode";

type OpenSettingsHandler = () => void;

type CloseSettingsHandler = () => void;

export interface UseSettingsVisibilityResult {
  readonly closeSettings: CloseSettingsHandler;
  readonly openSettings: OpenSettingsHandler;
  readonly settingsVisible: boolean;
}

export const useSettingsVisibility = (): UseSettingsVisibilityResult => {
  const [settingsVisible, setSettingsVisible] = useState(false);

  const openSettings = useCallback<OpenSettingsHandler>(() => {
    setSettingsVisible(true);
  }, []);

  const closeSettings = useCallback<CloseSettingsHandler>(() => {
    setSettingsVisible(false);
    postVsCodeMessage({ type: "settings:closed" });
  }, []);

  return {
    settingsVisible,
    openSettings,
    closeSettings,
  };
};
