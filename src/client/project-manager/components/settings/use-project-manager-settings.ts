import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import type { BrowserLocalizationRuntimePayload } from "../../../ui/src/app-host/localization-runtime-contract";
import { readBrowserLocalizationBootstrapSnapshot } from "../../../ui/src/app-host/localization-runtime-contract";
import {
  createDefaultSettings,
  mapSettingsSnapshot,
  type RawSettingsSnapshot,
  type Settings,
} from "../../../ui/src/components/settings/settings-state-model";
import { createBootstrapSettings } from "../../../ui/src/shared-hooks/use-bootstrap-settings";
import type { SettingsLoadedPayload } from "../../core-stream-message-types";

type IncomingMessage = {
  readonly type: string;
  readonly payload?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const useProjectManagerSettings = (): {
  readonly settings: Settings;
  readonly error: string | null;
  readonly localizationRuntime: BrowserLocalizationRuntimePayload;
  readonly reload: () => void;
} => {
  const bootstrapSnapshot = readBrowserLocalizationBootstrapSnapshot();
  const [localizationRuntime, setLocalizationRuntime] =
    useState<BrowserLocalizationRuntimePayload>(
      bootstrapSnapshot?.runtimePayload ?? null
    );
  const [settings, setSettings] = useState<Settings>(() =>
    createBootstrapSettings(bootstrapSnapshot)
  );
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.loadSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message: IncomingMessage) => {
      if (message.type !== "settings:loaded") {
        return;
      }

      if (!isRecord(message.payload)) {
        setSettings(createDefaultSettings());
        setError("Invalid settings payload");
        return;
      }

      const payload = message.payload as SettingsLoadedPayload;
      const rawSettings = payload.settings;

      if (!isRecord(rawSettings)) {
        setLocalizationRuntime(null);
        setSettings(createDefaultSettings());
        setError(typeof payload.error === "string" ? payload.error : null);
        return;
      }

      setLocalizationRuntime(payload.localizationRuntime ?? null);
      setSettings(mapSettingsSnapshot(rawSettings as RawSettingsSnapshot));
      setError(null);
    });

    const cachedPayload = api.getLastSettingsPayload();
    if (cachedPayload && isRecord(cachedPayload.settings)) {
      setLocalizationRuntime(cachedPayload.localizationRuntime ?? null);
      setSettings(mapSettingsSnapshot(cachedPayload.settings as RawSettingsSnapshot));
      setError(
        typeof cachedPayload.error === "string" ? cachedPayload.error : null
      );
    } else {
      reload();
    }

    return () => {
      unsubscribe();
    };
  }, [reload]);

  return { settings, error, localizationRuntime, reload };
};
