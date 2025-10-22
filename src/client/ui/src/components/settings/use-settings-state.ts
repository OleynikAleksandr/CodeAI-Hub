import { useCallback, useEffect, useRef, useState } from "react";
import vscode from "../../vscode";

type ThinkingSettings = {
  readonly enabled: boolean;
  readonly maxTokens: number;
};

export type Settings = {
  readonly thinking: ThinkingSettings;
};

type SettingsLoadedMessage = {
  readonly type: "settings:loaded";
  readonly settings: {
    readonly thinking?: RawThinkingSettings;
  };
};

type SettingsSavedMessage = {
  readonly type: "settings:saved";
  readonly settings?: {
    readonly thinking?: RawThinkingSettings;
  };
};

type IncomingMessage = SettingsLoadedMessage | SettingsSavedMessage;
type RawThinkingSettings = {
  readonly enabled?: unknown;
  readonly maxTokens?: unknown;
};

const DEFAULT_THINKING_MAX_TOKENS = 4000;
const RESET_DELAY_MS = 100;

const createDefaultSettings = (): Settings => ({
  thinking: {
    enabled: false,
    maxTokens: DEFAULT_THINKING_MAX_TOKENS,
  },
});

const mapThinkingSettings = (
  value: RawThinkingSettings | undefined
): ThinkingSettings => {
  const numericValue = Number(value?.maxTokens);
  return {
    enabled: Boolean(value?.enabled),
    maxTokens: Number.isFinite(numericValue)
      ? numericValue
      : DEFAULT_THINKING_MAX_TOKENS,
  };
};

const isIncomingMessage = (message: unknown): message is IncomingMessage => {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as { type?: unknown };
  return (
    candidate.type === "settings:loaded" || candidate.type === "settings:saved"
  );
};

export type UseSettingsStateResult = {
  readonly settings: Settings;
  readonly hasChanges: boolean;
  readonly saving: boolean;
  readonly resetting: boolean;
  readonly handleThinkingSettingsChange: (
    enabled: boolean,
    maxTokens: number
  ) => void;
  readonly handleSave: () => void;
  readonly handleReset: () => void;
};

export const useSettingsState = (): UseSettingsStateResult => {
  const initialEnabledRef = useRef(false);
  const [settings, setSettings] = useState<Settings>(createDefaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    vscode.postMessage({
      type: "settings:load",
    });

    const handleMessage = (event: MessageEvent) => {
      if (!isIncomingMessage(event.data)) {
        return;
      }

      if (event.data.type === "settings:loaded") {
        const thinking = mapThinkingSettings(event.data.settings.thinking);
        initialEnabledRef.current = thinking.enabled;
        setSettings({
          thinking,
        });
        setResetting(false);
        setHasChanges(false);
      }

      if (event.data.type === "settings:saved") {
        const thinking = mapThinkingSettings(event.data.settings?.thinking);
        initialEnabledRef.current = thinking.enabled;
        setSettings({
          thinking,
        });
        setSaving(false);
        setHasChanges(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleThinkingSettingsChange = useCallback(
    (enabled: boolean, maxTokens: number) => {
      const nextSettings: Settings = {
        thinking: {
          enabled,
          maxTokens,
        },
      };
      setSettings(nextSettings);

      const enabledChanged = enabled !== initialEnabledRef.current;
      setHasChanges(enabledChanged);
    },
    []
  );

  const handleSave = useCallback(() => {
    setSaving(true);
    vscode.postMessage({
      type: "settings:save",
      settings,
    });
  }, [settings]);

  const handleReset = useCallback(() => {
    setResetting(true);
    window.setTimeout(() => {
      vscode.postMessage({
        type: "settings:reset",
      });
    }, RESET_DELAY_MS);
  }, []);

  return {
    settings,
    hasChanges,
    saving,
    resetting,
    handleThinkingSettingsChange,
    handleSave,
    handleReset,
  };
};
