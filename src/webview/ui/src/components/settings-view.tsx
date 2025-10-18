import React, { useEffect, useRef, useState } from "react";
import vscode from "../vscode";
import ThinkingSettings from "./settings/thinking-settings";

type SettingsViewProps = {
  readonly onClose: () => void;
};

type Settings = {
  readonly thinking: {
    readonly enabled: boolean;
    readonly maxTokens: number;
  };
};

const RESET_DELAY_MS = 100;
const DEFAULT_THINKING_MAX_TOKENS = 4000;
const DISABLED_OPACITY = 0.6;

const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
  const initialEnabled = useRef(false);
  const [settings, setSettings] = useState<Settings>({
    thinking: {
      enabled: false,
      maxTokens: DEFAULT_THINKING_MAX_TOKENS,
    },
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    vscode.postMessage({
      type: "settings:load",
    });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "settings:loaded") {
        const loadedSettings: Settings = {
          thinking: message.settings.thinking || {
            enabled: false,
            maxTokens: DEFAULT_THINKING_MAX_TOKENS,
          },
        };

        initialEnabled.current = loadedSettings.thinking.enabled;
        setSettings(loadedSettings);
        setResetting(false);
        setHasChanges(false);
      } else if (message.type === "settings:saved") {
        if (message.settings?.thinking) {
          initialEnabled.current = Boolean(message.settings.thinking.enabled);
          setSettings({
            thinking: {
              enabled: Boolean(message.settings.thinking.enabled),
              maxTokens:
                Number(message.settings.thinking.maxTokens) ||
                DEFAULT_THINKING_MAX_TOKENS,
            },
          });
        }
        setSaving(false);
        setHasChanges(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleThinkingSettingsChange = (
    enabled: boolean,
    maxTokens: number
  ) => {
    const nextSettings: Settings = {
      thinking: {
        enabled,
        maxTokens,
      },
    };
    setSettings(nextSettings);

    const enabledChanged =
      nextSettings.thinking.enabled !== initialEnabled.current;
    setHasChanges(enabledChanged);
  };

  const handleSave = () => {
    setSaving(true);
    vscode.postMessage({
      type: "settings:save",
      settings,
    });
  };

  const handleReset = () => {
    setResetting(true);
    window.setTimeout(() => {
      vscode.postMessage({
        type: "settings:reset",
      });
    }, RESET_DELAY_MS);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#1e1e1e",
        color: "#cccccc",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #2d2d30",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          Settings
        </div>
        <button
          aria-label="Close settings"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid #3c3c3c",
            borderRadius: "4px",
            color: "#cccccc",
            cursor: "pointer",
            padding: "4px 8px",
            fontSize: "18px",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Close settings"
          type="button"
        >
          ×
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
        }}
      >
        <ThinkingSettings
          enabled={settings.thinking.enabled}
          maxTokens={settings.thinking.maxTokens}
          onChange={handleThinkingSettingsChange}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          borderTop: "1px solid #2d2d30",
          flexShrink: 0,
        }}
      >
        <button
          disabled={resetting}
          onClick={handleReset}
          onMouseEnter={(event) => {
            if (!resetting) {
              event.currentTarget.style.background = "#2d2d30";
              event.currentTarget.style.borderColor = "#4c4c4c";
            }
          }}
          onMouseLeave={(event) => {
            if (!resetting) {
              event.currentTarget.style.background = "transparent";
              event.currentTarget.style.borderColor = "#3c3c3c";
            }
          }}
          style={{
            padding: "6px 12px",
            background: resetting ? "#3c3c3c" : "transparent",
            border: "1px solid #3c3c3c",
            borderRadius: "4px",
            color: resetting ? "#808080" : "#cccccc",
            cursor: resetting ? "default" : "pointer",
            fontSize: "12px",
            transition: "all 0.2s ease",
            opacity: resetting ? DISABLED_OPACITY : 1,
          }}
          title="Reset all settings to defaults"
          type="button"
        >
          {resetting ? "Resetting..." : "Reset to Defaults"}
        </button>

        <div
          style={{
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            onClick={onClose}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "#2d2d30";
              event.currentTarget.style.borderColor = "#4c4c4c";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "transparent";
              event.currentTarget.style.borderColor = "#3c3c3c";
            }}
            style={{
              padding: "6px 16px",
              background: "transparent",
              border: "1px solid #3c3c3c",
              borderRadius: "4px",
              color: "#cccccc",
              cursor: "pointer",
              fontSize: "12px",
              transition: "all 0.2s ease",
            }}
            type="button"
          >
            Close
          </button>
          <button
            disabled={!hasChanges || saving}
            onClick={handleSave}
            onMouseEnter={(event) => {
              if (hasChanges && !saving) {
                event.currentTarget.style.background = "#1177bb";
              }
            }}
            onMouseLeave={(event) => {
              if (hasChanges && !saving) {
                event.currentTarget.style.background = "#0e639c";
              }
            }}
            style={{
              padding: "6px 16px",
              background: hasChanges && !saving ? "#0e639c" : "#3c3c3c",
              border: "none",
              borderRadius: "4px",
              color: hasChanges ? "#ffffff" : "#808080",
              cursor: hasChanges && !saving ? "pointer" : "default",
              fontSize: "12px",
              opacity: saving ? DISABLED_OPACITY : 1,
              transition: "all 0.2s ease",
            }}
            type="button"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SettingsView);
