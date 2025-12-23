import { useCallback, useEffect, useRef, useState } from "react";
import type { ClaudeModelAliasId } from "../../../../../types/claude-model-registry";
import vscode from "../../vscode";
import {
  areSettingsEqual,
  type CodexModelId,
  type CodexReasoningLevel,
  createDefaultSettings,
  mapSettingsSnapshot,
  type ProviderId,
  type ProviderVersions,
  type RawSettingsSnapshot,
  type Settings,
} from "./settings-state-model";

type VersionsState = {
  readonly data: ProviderVersions | null;
  readonly loading: boolean;
  readonly error?: string | null;
  readonly updatingTargets: readonly string[];
};

type SettingsLoadedMessage = {
  readonly type: "settings:loaded";
  readonly settings: RawSettingsSnapshot;
};

type SettingsSavedMessage = {
  readonly type: "settings:saved";
  readonly settings?: RawSettingsSnapshot;
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

const RESET_DELAY_MS = 100;

const createDefaultVersionsState = (): VersionsState => ({
  data: null,
  loading: true,
  error: null,
  updatingTargets: [],
});

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
  readonly handleClaudeDefaultModelChange: (
    modelId: ClaudeModelAliasId
  ) => void;
  readonly handleCodexDefaultModelChange: (modelId: CodexModelId) => void;
  readonly handleCodexReasoningChange: (
    modelId: CodexModelId,
    reasoning: CodexReasoningLevel
  ) => void;
  readonly handleProviderAutoUpdateChange: (
    provider: ProviderId,
    enabled: boolean
  ) => void;
  readonly handleSave: () => void;
  readonly handleReset: () => void;
  readonly handleUpdateProvider: (
    provider: ProviderId,
    target: "cli" | "sdk" | "core"
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
        const nextSettings = mapSettingsSnapshot(event.data.settings);
        initialSettingsRef.current = nextSettings;
        setSettings(nextSettings);
        setResetting(false);
        setHasChanges(false);
      }

      if (event.data.type === "settings:saved") {
        const nextSettings = mapSettingsSnapshot(event.data.settings);
        initialSettingsRef.current = nextSettings;
        setSettings(nextSettings);
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

  const updateSettings = useCallback((nextSettings: Settings) => {
    setSettings(nextSettings);
    setHasChanges(!areSettingsEqual(nextSettings, initialSettingsRef.current));
  }, []);

  const handleThinkingSettingsChange = useCallback(
    (enabled: boolean, maxTokens: number) => {
      const nextSettings: Settings = {
        ...settings,
        providers: {
          ...settings.providers,
          claude: {
            ...settings.providers.claude,
            thinking: {
              enabled,
              maxTokens,
            },
          },
        },
      };
      updateSettings(nextSettings);
    },
    [settings, updateSettings]
  );

  const handleClaudeDefaultModelChange = useCallback(
    (modelId: ClaudeModelAliasId) => {
      const nextSettings: Settings = {
        ...settings,
        providers: {
          ...settings.providers,
          claude: {
            ...settings.providers.claude,
            defaultModel: modelId,
          },
        },
      };
      updateSettings(nextSettings);
    },
    [settings, updateSettings]
  );

  const handleCodexDefaultModelChange = useCallback(
    (modelId: CodexModelId) => {
      const nextSettings: Settings = {
        ...settings,
        providers: {
          ...settings.providers,
          codex: {
            ...settings.providers.codex,
            defaultModel: modelId,
          },
        },
      };
      updateSettings(nextSettings);
    },
    [settings, updateSettings]
  );

  const handleCodexReasoningChange = useCallback(
    (modelId: CodexModelId, reasoning: CodexReasoningLevel) => {
      const nextSettings: Settings = {
        ...settings,
        providers: {
          ...settings.providers,
          codex: {
            ...settings.providers.codex,
            reasoningByModel: {
              ...settings.providers.codex.reasoningByModel,
              [modelId]: reasoning,
            },
          },
        },
      };
      updateSettings(nextSettings);
    },
    [settings, updateSettings]
  );

  const handleProviderAutoUpdateChange = useCallback(
    (provider: ProviderId, enabled: boolean) => {
      const nextSettings: Settings = {
        ...settings,
        providers: {
          ...settings.providers,
          [provider]: {
            ...settings.providers[provider],
            autoUpdate: {
              enabled,
            },
          },
        },
      };
      updateSettings(nextSettings);
    },
    [settings, updateSettings]
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
    (provider: ProviderId, target: "cli" | "sdk" | "core") => {
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
    handleClaudeDefaultModelChange,
    handleCodexDefaultModelChange,
    handleCodexReasoningChange,
    handleProviderAutoUpdateChange,
    handleSave,
    handleReset,
    handleUpdateProvider,
  };
};
