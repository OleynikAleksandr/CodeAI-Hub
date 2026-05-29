import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import type { BrowserLocalizationRuntimePayload } from "../../../ui/src/app-host/localization-runtime-contract";
import { readBrowserLocalizationBootstrapSnapshot } from "../../../ui/src/app-host/localization-runtime-contract";
import {
  createDefaultSettings,
  mapSettingsSnapshot,
  type ProviderId,
  type RawSettingsSnapshot,
  type Settings,
} from "../../../ui/src/components/settings/settings-state-model";
import type { VersionsState } from "../../../ui/src/components/settings/use-settings-state-support";
import { createBootstrapSettings } from "../../../ui/src/shared-hooks/use-bootstrap-settings";
import { serializeSettingsForPersistence } from "../../../ui/src/components/settings/settings-state-helpers";
import type {
  IncomingMessage,
  SettingsLoadedPayload,
  SettingsLocalizationSyncStatusPayload,
  SettingsProviderTarget,
  SettingsSaveErrorPayload,
  SettingsSnapshotPayload,
  SettingsTemplateUpdateResolutionAction,
  SettingsTemplateUpdateResolutionPayload,
  SettingsTemplateUpdatesPayload,
  SettingsUserGlossaryFilePayload,
  SettingsVersionsPayload,
} from "../../core-stream-message-types";
import {
  isWorkspaceSettingsPayloadForScope,
  resolveWorkspaceSettingsScope,
} from "../../services/project-manager-settings-client";
import type { WorkspaceSettingsScopePayload } from "../../services/project-manager-settings-client";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createVersionsState = (
  payload: SettingsVersionsPayload | null
): VersionsState => ({
  data: payload?.versions ?? null,
  error: payload?.error ?? null,
  loading: payload === null,
  updatingTargets: [],
});

type SettingsPayload = SettingsLoadedPayload | SettingsSnapshotPayload;

type TemplateUpdatesState = {
  readonly error: string | null;
  readonly loading: boolean;
  readonly resolving: boolean;
  readonly lastResolution: SettingsTemplateUpdateResolutionPayload | null;
  readonly updates: SettingsTemplateUpdatesPayload["updates"];
};

const resolveSettingsPayloadError = (payload: SettingsPayload): string | null =>
  "error" in payload && typeof payload.error === "string"
    ? payload.error
    : null;

const applySettingsPayload = (options: {
  readonly payload: SettingsPayload;
  readonly setError: (value: string | null) => void;
  readonly setLocalizationRuntime: (
    value: BrowserLocalizationRuntimePayload
  ) => void;
  readonly setSettings: (value: Settings) => void;
}): void => {
  const { payload, setError, setLocalizationRuntime, setSettings } = options;
  const rawSettings = payload.settings;

  if (!isRecord(rawSettings)) {
    setLocalizationRuntime(null);
    setSettings(createDefaultSettings());
    setError(resolveSettingsPayloadError(payload) ?? "Invalid settings payload");
    return;
  }

  if (payload.localizationRuntime) setLocalizationRuntime(payload.localizationRuntime);
  setSettings(mapSettingsSnapshot(rawSettings as RawSettingsSnapshot));
  setError(resolveSettingsPayloadError(payload));
};

const shouldApplySettingsPayload = (
  payload: unknown,
  settingsScope: WorkspaceSettingsScopePayload | undefined
): boolean =>
  settingsScope
    ? isWorkspaceSettingsPayloadForScope(payload, settingsScope)
    : true;

export type UseProjectManagerSettingsResult = {
  readonly settings: Settings;
  readonly error: string | null;
  readonly localizationRuntime: BrowserLocalizationRuntimePayload;
  readonly localizationSyncStatus: SettingsLocalizationSyncStatusPayload;
  readonly reset: () => void;
  readonly reload: () => void;
  readonly reloadVersions: () => void;
  readonly resetting: boolean;
  readonly save: (nextSettings: Settings) => void;
  readonly saveError: string | null;
  readonly saving: boolean;
  readonly updateProvider: (
    provider: ProviderId,
    target: SettingsProviderTarget
  ) => void;
  readonly templateUpdates: TemplateUpdatesState;
  readonly loadTemplateUpdates: () => void;
  readonly resolveTemplateUpdate: (
    id: string,
    action: SettingsTemplateUpdateResolutionAction
  ) => void;
  readonly userGlossaryFile: SettingsUserGlossaryFilePayload | null;
  readonly versions: VersionsState;
  readonly openUserGlossaryFile: () => void;
};

export const useProjectManagerSettings = (
  scope: WorkspaceSettingsScopePayload = {}
): UseProjectManagerSettingsResult => {
  const bootstrapSnapshot = readBrowserLocalizationBootstrapSnapshot();
  const [localizationRuntime, setLocalizationRuntime] =
    useState<BrowserLocalizationRuntimePayload>(
      bootstrapSnapshot?.runtimePayload ?? null
    );
  const [settings, setSettings] = useState<Settings>(() =>
    createBootstrapSettings(bootstrapSnapshot)
  );
  const [error, setError] = useState<string | null>(null);
  const [localizationSyncStatus, setLocalizationSyncStatus] =
    useState<SettingsLocalizationSyncStatusPayload>(() =>
      api.getLocalizationSyncStatus()
    );
  const [saveError, setSaveError] = useState<string | null>(() =>
    api.getLastSettingsSaveError()
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [versions, setVersions] = useState<VersionsState>(() =>
    createVersionsState(api.getLastSettingsVersionsPayload())
  );
  const [userGlossaryFile, setUserGlossaryFile] =
    useState<SettingsUserGlossaryFilePayload | null>(() =>
      api.getLastUserGlossaryFilePayload()
    );
  const [templateUpdates, setTemplateUpdates] = useState<TemplateUpdatesState>({
    error: null,
    loading: false,
    resolving: false,
    lastResolution: null,
    updates: [],
  });

  const settingsScope = useMemo(
    () => resolveWorkspaceSettingsScope(scope),
    [scope.workspacePath, scope.workspaceSlug]
  );

  const reload = useCallback(() => {
    if (settingsScope) {
      api.loadSettings(settingsScope);
    }
  }, [settingsScope]);

  const reloadVersions = useCallback(() => {
    setVersions((current) => ({
      ...current,
      error: null,
      loading: true,
    }));
    api.loadSettingsVersions();
  }, []);

  const save = useCallback((nextSettings: Settings) => {
    setSaving(true);
    setSaveError(null);
    api.saveSettings(
      serializeSettingsForPersistence(nextSettings),
      settingsScope
    );
  }, [settingsScope]);

  const reset = useCallback(() => {
    setResetting(true);
    setSaveError(null);
    api.resetSettings(settingsScope);
  }, [settingsScope]);

  const updateProvider = useCallback(
    (provider: ProviderId, target: SettingsProviderTarget) => {
      if (provider === "kimi") {
        return;
      }
      const targetKey = `${provider}:${target}`;
      setVersions((current) => ({
        ...current,
        error: null,
        updatingTargets: [...new Set([...current.updatingTargets, targetKey])],
      }));
      api.updateSettingsProvider(provider, target);
    },
    []
  );

  const openUserGlossaryFile = useCallback(() => {
    setUserGlossaryFile(null);
    api.openUserGlossaryFile();
  }, []);

  const loadTemplateUpdates = useCallback(() => {
    setTemplateUpdates((current) => ({
      ...current,
      error: null,
      loading: true,
    }));
    api.loadTemplateUpdates();
  }, []);

  const resolveTemplateUpdate = useCallback(
    (id: string, action: SettingsTemplateUpdateResolutionAction) => {
      setTemplateUpdates((current) => ({
        ...current,
        error: null,
        resolving: true,
      }));
      api.resolveTemplateUpdate(id, action);
    },
    []
  );

  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message: IncomingMessage) => {
      switch (message.type) {
        case "settings:loaded":
        case "settings:saved": {
          if (!shouldApplySettingsPayload(message.payload, settingsScope)) {
            return;
          }
          applySettingsPayload({
            payload: message.payload as SettingsPayload,
            setError,
            setLocalizationRuntime,
            setSettings,
          });
          setSaving(false);
          setResetting(false);
          setSaveError(null);
          return;
        }
        case "settings:save-error": {
          if (!shouldApplySettingsPayload(message.payload, settingsScope)) {
            return;
          }
          const payload = message.payload as SettingsSaveErrorPayload;
          setSaving(false);
          setResetting(false);
          setSaveError(payload.error);
          return;
        }
        case "settings:localization-sync-status": {
          setLocalizationSyncStatus(
            message.payload as SettingsLocalizationSyncStatusPayload
          );
          return;
        }
        case "settings:versions": {
          const payload = message.payload as SettingsVersionsPayload;
          setVersions({
            data: payload.versions ?? null,
            error: payload.error ?? null,
            loading: false,
            updatingTargets: [],
          });
          return;
        }
        case "settings:user-glossary-file": {
          setUserGlossaryFile(message.payload as SettingsUserGlossaryFilePayload);
          return;
        }
        case "settings:template-updates:result": {
          const payload = message.payload as SettingsTemplateUpdatesPayload;
          setTemplateUpdates((current) => ({
            ...current,
            error: payload.error ?? null,
            loading: false,
            updates: payload.updates,
          }));
          return;
        }
        case "settings:template-update:resolve:result": {
          const payload =
            message.payload as SettingsTemplateUpdateResolutionPayload;
          setTemplateUpdates({
            error: payload.error ?? null,
            lastResolution: payload,
            loading: false,
            resolving: false,
            updates: payload.pendingUpdates,
          });
          return;
        }
        default: {
          return;
        }
      }
    });

    const cachedPayload = settingsScope ? null : api.getLastSettingsPayload();
    if (cachedPayload) {
      applySettingsPayload({
        payload: cachedPayload,
        setError,
        setLocalizationRuntime,
        setSettings,
      });
    } else {
      if (settingsScope) {
        reload();
      }
    }
    if (api.getLastSettingsVersionsPayload() === null) {
      reloadVersions();
    }

    return () => {
      unsubscribe();
    };
  }, [reload, reloadVersions, settingsScope]);

  return {
    settings,
    error,
    localizationRuntime,
    localizationSyncStatus,
    reload,
    reloadVersions,
    save,
    reset,
    saveError,
    saving,
    resetting,
    versions,
    updateProvider,
    templateUpdates,
    loadTemplateUpdates,
    resolveTemplateUpdate,
    userGlossaryFile,
    openUserGlossaryFile,
  };
};
