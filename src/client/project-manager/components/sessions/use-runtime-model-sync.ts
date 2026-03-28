/**
 * Runtime Model Sync — listens for session:model:update events from Core
 * and updates snapshot status.models with the actual runtime model.
 *
 * Universal for all providers. When a provider reports a different model
 * (e.g., after switch_model), the status panel label updates to reflect
 * the actual model in use rather than the settings default.
 */

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { api } from "../../api";
import { useProjectManagerSettings } from "../settings/use-project-manager-settings";
import { buildModelInfo } from "../../../ui/src/session/model-info-builder";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";

const modelInfoChanged = (
  left: {
    readonly modelDisplayName: string;
    readonly modelId: string;
    readonly providerId: string;
    readonly reasoning?: string;
    readonly source?: "settings" | "runtime";
  },
  right: {
    readonly modelDisplayName: string;
    readonly modelId: string;
    readonly providerId: string;
    readonly reasoning?: string;
    readonly source?: "settings" | "runtime";
  }
): boolean =>
  left.modelId !== right.modelId ||
  left.modelDisplayName !== right.modelDisplayName ||
  left.providerId !== right.providerId ||
  left.reasoning !== right.reasoning ||
  left.source !== right.source;

export const useRuntimeModelSync = (
  activeSessionId: string | null,
  setSnapshots: Dispatch<SetStateAction<SessionSnapshots>>
): void => {
  const { settings } = useProjectManagerSettings();

  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type !== "session:model:update") {
        return;
      }
      const payload = message.payload as {
        sessionId?: string;
        providerId?: string;
        modelId?: string;
      } | null;
      if (!payload?.sessionId || !payload.modelId) {
        return;
      }
      const { sessionId, modelId } = payload;
      setSnapshots((previous) => {
        // Core broadcasts with its runtime sessionId, but PM dialog sessions
        // may store the snapshot under the dialogId. Fall back to activeSessionId
        // when the broadcast sessionId has no matching snapshot.
        const resolvedId =
          previous[sessionId]?.status.models?.length
            ? sessionId
            : activeSessionId && previous[activeSessionId]?.status.models?.length
              ? activeSessionId
              : null;
        if (!resolvedId) {
          return previous;
        }
        const snapshot = previous[resolvedId];
        const models = snapshot.status.models;
        if (!models?.length) {
          return previous;
        }
        const currentModel = models[0];
        const updatedModel = buildModelInfo(
          (payload.providerId as typeof currentModel.providerId | undefined) ??
            currentModel.providerId,
          settings,
          modelId,
          "runtime"
        );
        if (!modelInfoChanged(currentModel, updatedModel)) {
          return previous;
        }
        const updatedModels = [
          updatedModel,
          ...models.slice(1),
        ];
        return {
          ...previous,
          [resolvedId]: {
            ...snapshot,
            status: { ...snapshot.status, models: updatedModels },
          },
        };
      });
    });
    return () => {
      unsubscribe();
    };
  }, [activeSessionId, settings, setSnapshots]);
};
