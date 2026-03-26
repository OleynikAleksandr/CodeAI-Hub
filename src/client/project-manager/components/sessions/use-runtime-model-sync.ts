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
import type { SessionSnapshots } from "../../../ui/src/session/helpers";

const formatModelDisplayName = (modelId: string): string =>
  modelId
    .split("-")
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");

export const useRuntimeModelSync = (
  activeSessionId: string | null,
  setSnapshots: Dispatch<SetStateAction<SessionSnapshots>>
): void => {
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
        const snapshot = previous[sessionId];
        if (!snapshot?.status.models?.length) {
          return previous;
        }
        const currentModel = snapshot.status.models[0];
        if (currentModel.modelId === modelId) {
          return previous;
        }
        const updatedModels = [
          {
            ...currentModel,
            modelId,
            modelDisplayName: formatModelDisplayName(modelId),
          },
          ...snapshot.status.models.slice(1),
        ];
        return {
          ...previous,
          [sessionId]: {
            ...snapshot,
            status: { ...snapshot.status, models: updatedModels },
          },
        };
      });
    });
    return () => {
      unsubscribe();
    };
  }, [activeSessionId, setSnapshots]);
};
