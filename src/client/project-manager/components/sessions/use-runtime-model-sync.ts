/**
 * Runtime Model Sync — listens for session:model:update events from Core
 * and updates snapshot status.models with the actual runtime model.
 *
 * Universal for all providers. When a provider reports a different model
 * (e.g., after switch_model), the status panel label updates to reflect
 * the actual model in use rather than the settings default.
 */

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ModelInfo } from "../../../../types/session";
import { api } from "../../api";
import { buildModelInfo } from "../../../ui/src/session/model-info-builder";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";

const modelInfoChanged = (
  left: Pick<
    ModelInfo,
    "modelDisplayName" | "modelId" | "providerId" | "reasoning" | "source"
  >,
  right: Pick<
    ModelInfo,
    "modelDisplayName" | "modelId" | "providerId" | "reasoning" | "source"
  >
): boolean =>
  left.modelId !== right.modelId ||
  left.modelDisplayName !== right.modelDisplayName ||
  left.providerId !== right.providerId ||
  left.reasoning !== right.reasoning ||
  left.source !== right.source;

type RuntimeModelUpdatePayload = {
  readonly modelId: string;
  readonly providerId?: string;
  readonly sessionId: string;
};

const applyRuntimeModelUpdate = (
  previous: SessionSnapshots,
  resolvedId: string,
  payload: RuntimeModelUpdatePayload
): SessionSnapshots => {
  const snapshot = previous[resolvedId];
  const models = snapshot?.status.models;
  if (!models?.length) {
    return previous;
  }
  const currentModel = models[0];
  const updatedModel = buildModelInfo(
    (payload.providerId as typeof currentModel.providerId | undefined) ??
      currentModel.providerId,
    null,
    payload.modelId,
    "runtime"
  );
  if (!modelInfoChanged(currentModel, updatedModel)) {
    return previous;
  }

  return {
    ...previous,
    [resolvedId]: {
      ...snapshot,
      status: {
        ...snapshot.status,
        models: [updatedModel, ...models.slice(1)],
      },
    },
  };
};

export const useRuntimeModelSync = (
  activeSessionId: string | null,
  setSnapshots: Dispatch<SetStateAction<SessionSnapshots>>
): void => {
  const pendingUpdatesRef = useRef(new Map<string, RuntimeModelUpdatePayload>());

  useEffect(() => {
    setSnapshots((previous) => {
      if (!activeSessionId) {
        return previous;
      }
      const pendingUpdate = pendingUpdatesRef.current.get(activeSessionId);
      if (!pendingUpdate) {
        return previous;
      }

      const next = applyRuntimeModelUpdate(
        previous,
        activeSessionId,
        pendingUpdate
      );
      if (next !== previous) {
        pendingUpdatesRef.current.delete(activeSessionId);
        pendingUpdatesRef.current.delete(pendingUpdate.sessionId);
      }
      return next;
    });

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
          const pendingUpdate = {
            modelId,
            providerId: payload.providerId,
            sessionId,
          } satisfies RuntimeModelUpdatePayload;
          pendingUpdatesRef.current.set(sessionId, pendingUpdate);
          if (activeSessionId) {
            pendingUpdatesRef.current.set(activeSessionId, pendingUpdate);
          }
          return previous;
        }
        pendingUpdatesRef.current.delete(sessionId);
        if (activeSessionId) {
          pendingUpdatesRef.current.delete(activeSessionId);
        }
        return applyRuntimeModelUpdate(previous, resolvedId, {
          modelId,
          providerId: payload.providerId,
          sessionId,
        });
      });
    });
    return () => {
      unsubscribe();
    };
  }, [activeSessionId, setSnapshots]);
};
