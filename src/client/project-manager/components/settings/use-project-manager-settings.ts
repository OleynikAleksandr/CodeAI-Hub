import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import {
  mapSettingsSnapshot,
  type RawSettingsSnapshot,
  type Settings,
} from "../../../ui/src/components/settings/settings-state-model";

type IncomingMessage = {
  readonly type: string;
  readonly payload?: unknown;
};

type SettingsLoadedPayload = {
  readonly settings?: unknown;
  readonly error?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const useProjectManagerSettings = (): {
  readonly settings: Settings | null;
  readonly error: string | null;
  readonly reload: () => void;
} => {
  const [settings, setSettings] = useState<Settings | null>(null);
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
        setSettings(null);
        setError("Invalid settings payload");
        return;
      }

      const payload = message.payload as SettingsLoadedPayload;
      const rawSettings = payload.settings;

      if (!isRecord(rawSettings)) {
        setSettings(null);
        setError(typeof payload.error === "string" ? payload.error : null);
        return;
      }

      setSettings(mapSettingsSnapshot(rawSettings as RawSettingsSnapshot));
      setError(null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { settings, error, reload };
};

