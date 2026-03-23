import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import { persistIdeaArtifacts } from "../../../ui/src/services/idea-artifact-persistence";
import { extractIdeaCollectorArtifact } from "../../../ui/src/services/idea-collector-artifact";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";
import { composeDiagramModulesAggregate } from "./diagram-modules-aggregate";
import type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const DIAGRAM_MODULES_SEQUENCE_LOCK_REASON = "diagram_modules_sequence";

const readStreamEventType = (value: unknown): string | null =>
  isRecord(value) && typeof value.type === "string" ? value.type : null;

const readDiagramModulesProgress = (
  value: unknown
): { readonly substep: string; readonly currentPartId?: string } | null => {
  if (!isRecord(value) || typeof value.substep !== "string") {
    return null;
  }
  const currentPartId =
    typeof value.currentPartId === "string" ? value.currentPartId : undefined;
  return { substep: value.substep, currentPartId };
};

const buildContinuationSignature = (params: {
  readonly sessionId: string;
  readonly progress: { readonly substep: string; readonly currentPartId?: string };
}): string | null => {
  if (params.progress.substep === "compose_aggregate") {
    return `${params.sessionId}:compose_aggregate`;
  }
  if (
    params.progress.substep !== "generate_product_part" ||
    !params.progress.currentPartId
  ) {
    return null;
  }
  return `${params.sessionId}:${params.progress.substep}:${params.progress.currentPartId}`;
};

const buildDiagramModulesContinuationPrompt = (params: {
  readonly workspaceSlug: string;
  readonly progress: { readonly substep: string; readonly currentPartId?: string };
}): string | null => {
  if (
    params.progress.substep !== "generate_product_part" ||
    !params.progress.currentPartId
  ) {
    return null;
  }
  return [
    "Runtime continuation for Diagram Modules.",
    `Next substep: generate_product_part.`,
    `Target Product Part: \`${params.progress.currentPartId}\`.`,
    `Create or update only \`.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${params.progress.currentPartId}.md\`.`,
    "Do not rewrite already generated Product Parts.",
    "If you hit blocking ambiguity, stop and ask the user one explicit question.",
  ].join("\n");
};

export const useDiagramModulesOrchestration = (options: {
  readonly sessionRef: MutableRefObject<SessionRecord | null>;
  readonly pendingIntentRef: MutableRefObject<DialogOpenIntent | null>;
  readonly setSnapshots: Dispatch<SetStateAction<SessionSnapshots>>;
}) => {
  const queuedBySessionRef = useRef(new Map<string, Promise<void>>());
  const dispatchedSignatureRef = useRef(new Map<string, string>());

  const setSequenceLock = (sessionId: string, active: boolean) => {
    options.setSnapshots((previous) => {
      const current = previous[sessionId];
      if (!current) {
        return previous;
      }
      const currentReason = current.status.continuityLock?.reason;
      const isSequenceLock = currentReason === DIAGRAM_MODULES_SEQUENCE_LOCK_REASON;
      if (active) {
        const now = Date.now();
        return {
          ...previous,
          [sessionId]: {
            ...current,
            status: {
              ...current.status,
              connectionState:
                current.status.connectionState === "running"
                  ? "running"
                  : "blocked",
              continuityLock: {
                ...(current.status.continuityLock ?? { active: false, updatedAt: now }),
                active: true,
                reason: DIAGRAM_MODULES_SEQUENCE_LOCK_REASON,
                updatedAt: now,
              },
              updatedAt: now,
            },
          },
        };
      }
      if (!isSequenceLock) {
        return previous;
      }
      const now = Date.now();
      return {
        ...previous,
        [sessionId]: {
          ...current,
          status: {
            ...current.status,
            connectionState:
              current.status.connectionState === "blocked" ? "idle" : current.status.connectionState,
            continuityLock: {
              active: false,
              updatedAt: now,
            },
            updatedAt: now,
          },
        },
      };
    });
  };

  const queueContinuationCheck = (params: {
    readonly sessionId: string;
    readonly session: SessionRecord;
    readonly intent: DialogOpenIntent;
    readonly shouldRefreshWorkflowState: boolean;
    readonly artifact?: ReturnType<typeof extractIdeaCollectorArtifact> | null;
  }) => {
    const queued = queuedBySessionRef.current.get(params.sessionId) ?? Promise.resolve();
    const nextRun = queued
      .catch(() => undefined)
      .then(async () => {
        const httpUrl = api.getHttpUrl();
        if (!httpUrl) {
          return;
        }
        if (params.session.stage !== "diagram_modules") {
          return;
        }
        if (params.artifact) {
          const result = await persistIdeaArtifacts({
            httpUrl,
            sessionId: params.sessionId,
            artifact: params.artifact,
          });
          if (!result.ok) {
            return;
          }
        }
        if (!params.shouldRefreshWorkflowState) {
          return;
        }
        const state = await api.getWorkflowState(
          params.intent.workspaceSlug,
          params.intent.workspacePath
        );
        const progress = readDiagramModulesProgress(state?.diagramModulesProgress);
        if (!progress) {
          return;
        }
        const signature = buildContinuationSignature({
          sessionId: params.sessionId,
          progress,
        });
        const prompt = buildDiagramModulesContinuationPrompt({
          workspaceSlug: params.intent.workspaceSlug,
          progress,
        });
        if (!signature) {
          setSequenceLock(params.sessionId, false);
          return;
        }
        if (dispatchedSignatureRef.current.get(params.sessionId) === signature) {
          return;
        }
        dispatchedSignatureRef.current.set(params.sessionId, signature);
        setSequenceLock(params.sessionId, true);
        if (progress.substep === "compose_aggregate") {
          const aggregateResult = await composeDiagramModulesAggregate({
            httpUrl,
            workspacePath: params.intent.workspacePath,
            workspaceSlug: params.intent.workspaceSlug,
          });
          if (!aggregateResult.ok) {
            console.warn(
              "[DiagramModulesOrchestration] Aggregate compose failed",
              aggregateResult.error
            );
          }
          setSequenceLock(params.sessionId, false);
          return;
        }
        if (!prompt) {
          setSequenceLock(params.sessionId, false);
          return;
        }
        api.sendSessionMessage(params.sessionId, prompt, {
          workflowControl: { visibility: "hidden" },
        });
      })
      .finally(() => {
        if (queuedBySessionRef.current.get(params.sessionId) === nextRun) {
          queuedBySessionRef.current.delete(params.sessionId);
        }
      });
    queuedBySessionRef.current.set(params.sessionId, nextRun);
  };

  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type !== "session:stream") {
        return;
      }
      const payload = isRecord(message.payload) ? message.payload : null;
      const sessionId =
        payload && typeof payload.sessionId === "string" ? payload.sessionId : null;
      const session = options.sessionRef.current;
      const intent = options.pendingIntentRef.current;
      if (!(sessionId && session && intent) || sessionId !== session.id) {
        return;
      }
      const artifact = extractIdeaCollectorArtifact(payload?.event);
      const eventType = readStreamEventType(payload?.event);
      if (eventType === "turn_failed") {
        setSequenceLock(sessionId, false);
        return;
      }
      const shouldRefreshWorkflowState =
        artifact !== null || eventType === "turn_completed";
      if (!shouldRefreshWorkflowState) {
        return;
      }
      queueContinuationCheck({
        sessionId,
        session,
        intent,
        shouldRefreshWorkflowState,
        artifact,
      });
    });

    return () => {
      unsubscribe();
      queuedBySessionRef.current.clear();
      dispatchedSignatureRef.current.clear();
    };
  }, [options.pendingIntentRef, options.sessionRef]);
};
