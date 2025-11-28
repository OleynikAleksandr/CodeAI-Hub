import { useCallback, useEffect, useRef, useState } from "react";
import vscode from "../../vscode";

type ThinkingSettings = {
  readonly enabled: boolean;
  readonly maxTokens: number;
};

export type Settings = {
  readonly thinking: ThinkingSettings;
};

export type VersionEntry = {
  readonly packageName: string;
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
  readonly source: "global";
  readonly error?: string | null;
};

export type ProviderVersions = {
  readonly claude: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly codex: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly gemini: {
    readonly core: VersionEntry;
  };
  readonly checkedAt?: string;
};

type VersionsState = {
  readonly data: ProviderVersions | null;
  readonly loading: boolean;
  readonly error?: string | null;
  readonly updatingTargets: readonly string[];
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

type VersionsLoadedMessage = {
  readonly type: "settings:versions";
  readonly versions?: ProviderVersions;
  readonly error?: string;
};

type IncomingMessage =
  | SettingsLoadedMessage
  | SettingsSavedMessage
  | VersionsLoadedMessage;
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

const createDefaultVersionsState = (): VersionsState => ({
  data: null,
  loading: true,
  error: null,
  updatingTargets: [],
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
    candidate.type === "settings:loaded" ||
    candidate.type === "settings:saved" ||
    candidate.type === "settings:versions"
  );
};

export type UseSettingsStateResult = {
  readonly settings: Settings;
  readonly hasChanges: boolean;
  readonly saving: boolean;
  readonly resetting: boolean;
  readonly versions: VersionsState;
  readonly handleThinkingSettingsChange: (
    enabled: boolean,
    maxTokens: number
  ) => void;
  readonly handleSave: () => void;
  readonly handleReset: () => void;
  readonly handleUpdateProvider: (
    provider: "claude" | "codex",
    target: "cli" | "sdk"
  ) => void;
};

export const useSettingsState = (): UseSettingsStateResult => {
  const initialSettingsRef = useRef<Settings>(createDefaultSettings());
  const [settings, setSettings] = useState<Settings>(createDefaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [versions, setVersions] = useState<VersionsState>(
    createDefaultVersionsState
  );

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
        initialSettingsRef.current = {
          thinking,
        };
        setSettings({
          thinking,
        });
        setResetting(false);
        setHasChanges(false);
      }

      if (event.data.type === "settings:saved") {
        const thinking = mapThinkingSettings(event.data.settings?.thinking);
        initialSettingsRef.current = {
          thinking,
        };
        setSettings({
          thinking,
        });
        setSaving(false);
        setHasChanges(false);
      }

      if (event.data.type === "settings:versions") {
        const incomingVersions = event.data.versions ?? null;
        setVersions({
          data: incomingVersions,
          loading: false,
          error: event.data.error ?? null,
          updatingTargets: [],
        });
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

      const initialThinking = initialSettingsRef.current.thinking;
      const enabledChanged = enabled !== initialThinking.enabled;
      const tokensChanged = maxTokens !== initialThinking.maxTokens;
      setHasChanges(enabledChanged || tokensChanged);
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

  const handleUpdateProvider = useCallback(
    (provider: "claude" | "codex", target: "cli" | "sdk") => {
      const targetKey = `${provider}:${target}`;
      setVersions((prev) => ({
        ...prev,
        updatingTargets: [...new Set([...prev.updatingTargets, targetKey])],
      }));
      vscode.postMessage({
        type: "settings:update-provider",
        provider,
        target,
      });
    },
    []
  );

  return {
    settings,
    hasChanges,
    saving,
    resetting,
    versions,
    handleThinkingSettingsChange,
    handleSave,
    handleReset,
    handleUpdateProvider,
  };
};
