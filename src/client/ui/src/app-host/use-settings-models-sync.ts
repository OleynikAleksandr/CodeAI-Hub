import { useEffect } from "react";
import type { ModelInfo, SessionRecord } from "../../../../types/session";
import type { Settings } from "../components/settings/settings-state-model";
import type { SessionSnapshots } from "../session/helpers";
import {
  buildModelInfo,
  buildModelInfoList,
} from "../session/model-info-builder";

const rebuildReadySessionModels = (
  models: readonly ModelInfo[],
  settings: Settings
): readonly ModelInfo[] =>
  models.map((model) =>
    buildModelInfo(
      model.providerId,
      settings,
      model.modelId,
      model.source ?? "runtime"
    )
  );

const hasSessionOwnedModel = (models: readonly ModelInfo[]): boolean =>
  models.some(
    (model) => model.source === "binding" || model.source === "runtime"
  );

const shouldPreserveSnapshotModels = (
  session: SessionRecord,
  models: readonly ModelInfo[]
): boolean => Boolean(session.modelBinding) || hasSessionOwnedModel(models);

export const applySettingsModels = (
  previous: SessionSnapshots,
  sessions: readonly SessionRecord[],
  settings: Settings
): SessionSnapshots => {
  let next = previous;
  for (const session of sessions) {
    const snapshot = previous[session.id];
    if (!snapshot) {
      continue;
    }
    const currentModels = snapshot.status.models ?? [];
    if (shouldPreserveSnapshotModels(session, currentModels)) {
      continue;
    }

    const sessionReady = snapshot.binding.status === "ready";
    const newModels =
      sessionReady && currentModels.length > 0
        ? rebuildReadySessionModels(currentModels, settings)
        : buildModelInfoList(session.providerIds, settings);
    const modelsChanged =
      JSON.stringify(newModels) !== JSON.stringify(snapshot.status.models);
    if (modelsChanged) {
      if (next === previous) {
        next = { ...previous };
      }
      next[session.id] = {
        ...snapshot,
        status: { ...snapshot.status, models: newModels },
      };
    }
  }
  return next;
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
