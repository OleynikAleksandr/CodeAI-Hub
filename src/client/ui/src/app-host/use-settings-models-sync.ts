import { useEffect } from "react";
import type { SessionRecord } from "../../../../types/session";
import type { Settings } from "../components/settings/settings-state-model";
import type { SessionSnapshots } from "../session/helpers";
import { buildModelInfoList } from "../session/model-info-builder";

const hasRuntimeModelOverride = (
  snapshot: SessionSnapshots[string],
  settingsModelId: string | undefined
): boolean => {
  const currentModel = snapshot.status.models?.[0];
  return Boolean(
    currentModel?.source === "runtime" &&
      currentModel.modelId &&
      settingsModelId
  );
};

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
    if (hasRuntimeModelOverride(snapshot, newModels[0]?.modelId)) {
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
