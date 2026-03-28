import { useEffect } from "react";
import type { ModelInfo, SessionRecord } from "../../../../types/session";
import type { Settings } from "../components/settings/settings-state-model";
import type { SessionSnapshots } from "../session/helpers";
import {
  buildModelInfo,
  buildModelInfoList,
} from "../session/model-info-builder";

const hasRuntimeModelOverride = (
  snapshot: SessionSnapshots[string]
): boolean => {
  const currentModel = snapshot.status.models?.[0];
  return currentModel?.source === "runtime";
};

const syncRuntimeModelWithSettings = (
  currentModel: ModelInfo,
  settings: Settings
): ModelInfo =>
  buildModelInfo(
    currentModel.providerId,
    settings,
    currentModel.modelId,
    "runtime"
  );

const applySettingsModels = (
  previous: SessionSnapshots,
  sessions: readonly SessionRecord[],
  settings: Settings
): SessionSnapshots => {
  let hasChanges = false;
  const next: SessionSnapshots = {};
  for (const session of sessions) {
    const snapshot = previous[session.id];
    if (!snapshot) {
      continue;
    }
    const newModels = buildModelInfoList(session.providerIds, settings);
    // Runtime model was changed (e.g., switch_model) — preserve the override.
    if (hasRuntimeModelOverride(snapshot)) {
      const currentModels = snapshot.status.models ?? [];
      const mergedRuntimeModels = currentModels.map((model, index) =>
        model.source === "runtime"
          ? syncRuntimeModelWithSettings(model, settings)
          : (newModels[index] ?? model)
      );
      const modelsChanged =
        JSON.stringify(mergedRuntimeModels) !==
        JSON.stringify(snapshot.status.models);
      if (modelsChanged) {
        hasChanges = true;
        next[session.id] = {
          ...snapshot,
          status: { ...snapshot.status, models: mergedRuntimeModels },
        };
        continue;
      }
      next[session.id] = snapshot;
      continue;
    }
    const modelsChanged =
      JSON.stringify(newModels) !== JSON.stringify(snapshot.status.models);
    if (modelsChanged) {
      hasChanges = true;
      next[session.id] = {
        ...snapshot,
        status: { ...snapshot.status, models: newModels },
      };
    } else {
      next[session.id] = snapshot;
    }
  }
  return hasChanges ? next : previous;
};

/**
 * Sync models in session snapshots when settings change.
 * This ensures reasoning levels are updated when user changes settings.
 */
export const useSettingsModelsSync = (
  sessions: readonly SessionRecord[],
  settings: Settings | null,
  setSnapshots: React.Dispatch<React.SetStateAction<SessionSnapshots>>
): void => {
  useEffect(() => {
    if (!settings || sessions.length === 0) {
      return;
    }
    setSnapshots((previous) =>
      applySettingsModels(previous, sessions, settings)
    );
  }, [sessions, settings, setSnapshots]);
};
