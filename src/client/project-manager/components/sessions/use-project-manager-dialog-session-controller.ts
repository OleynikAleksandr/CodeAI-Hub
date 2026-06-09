import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CodexReasoningLevel } from "../../../../types/codex-model-registry";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";
import { useProjectManagerCoreStatusHydrator } from "./status-hydrator";
import { applySessionModelBindingToSnapshot, createInitialSnapshot, resolveSessionThinkingDisplayEnabled, type SessionSnapshots } from "../../../ui/src/session/helpers";
import { SessionMessageLocalizationFacade } from "../../../ui/src/session/session-message-localization-facade";
import { useSettingsModelsSync } from "../../../ui/src/app-host/use-settings-models-sync";
import { buildProviderLabels, createDialogRequestId, type DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";
import { type ClaudeModelAliasId, type ClaudeThinkingSelection } from "./project-manager-dialog-model-switch-helpers";
import { useProjectManagerSettings } from "../settings/use-project-manager-settings";
import { applyWorkspaceSnapshotToSnapshots, useProjectManagerSessionStream } from "./session-stream";
import { updateSnapshotsWithTokenUsage } from "./token-usage-stream";
import { shouldRefreshDialogHistoryForStream, updateSnapshotsWithTurnState } from "./turn-state-stream";
import { seedSnapshotWithCachedUsageLimits, updateSnapshotsWithUsageLimits } from "./usage-limits-stream";
import { appendOptimisticUserMessage } from "./session-message-dedupe";
import { shouldSuppressIdleDialogRestoreRefresh, useProjectManagerDialogCoreEvents } from "./use-project-manager-dialog-core-events";
type DialogHistoryRequestOptions = { readonly force?: boolean } | null | undefined;

export const useProjectManagerDialogSessionController = (
  intent: DialogOpenIntent | null
) => {
  const sessionMessageLocalization = useMemo(() => new SessionMessageLocalizationFacade(), []);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const [tokenDebugSummaryOverride, setTokenDebugSummaryOverride] = useState<string | undefined>(undefined);
  const latestWorkspaceSnapshotRef = useRef<WorkspaceSnapshotPushPayload | null>(null);

  const loadedDialogIdsRef = useRef(new Set<string>());
  const dialogCursorRef = useRef(new Map<string, number>());
  const pendingHistoryCursorRef = useRef(new Map<string, number>());
  const queuedHistoryRefreshRef = useRef(new Set<string>());
  const restoreRequestInFlightRef = useRef(new Map<string, number>());
  const pendingIntentRef = useRef<DialogOpenIntent | null>(null);
  const dialogIdRef = useRef<string | null>(null);
  const lastProviderSessionIdRef = useRef<string | null>(null);

  const { settings, reload } = useProjectManagerSettings();
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    if (!session?.id) {
      return;
    }
    reload();
  }, [reload, session?.id]);

  const sessionRef = useRef<SessionRecord | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const connection = useProjectManagerCoreStatusHydrator({
    onHydrate: () => {},
    onSessionHistory: () => {},
  });

  const providerLabels = useMemo(() => {
    const providerId = session?.providerIds[0] ?? null;
    return buildProviderLabels(providerId ?? null);
  }, [session]);

  const requestDialogList = useCallback((intent: DialogOpenIntent) => {
    api.dialogs.listDialogs(intent.workspaceSlug, {
      workspacePath: intent.workspacePath,
    });
  }, []);

  const requestDialogHistory = useCallback(
    (
      intent: DialogOpenIntent,
      dialogId: string,
      cursor?: number | null,
      options?: DialogHistoryRequestOptions
    ) => {
      const resolvedCursor =
        typeof cursor === "number" && Number.isFinite(cursor)
          ? Math.max(0, Math.trunc(cursor))
          : 0;

      if (resolvedCursor === 0) {
        if (!options?.force && loadedDialogIdsRef.current.has(dialogId)) {
          return;
        }
        loadedDialogIdsRef.current.add(dialogId);
      }

      if (pendingHistoryCursorRef.current.has(dialogId)) {
        queuedHistoryRefreshRef.current.add(dialogId);
        return;
      }

      api.dialogs.requestDialogHistory(intent.workspaceSlug, dialogId, {
        ...(resolvedCursor > 0 ? { cursor: resolvedCursor } : {}),
        workspacePath: intent.workspacePath,
      });

      pendingHistoryCursorRef.current.set(dialogId, resolvedCursor);
      if (resolvedCursor === 0 && !options?.force) {
        window.setTimeout(() => {
          const activeIntent = pendingIntentRef.current;
          if (!activeIntent || !pendingHistoryCursorRef.current.has(dialogId)) return;
          pendingHistoryCursorRef.current.delete(dialogId);
          loadedDialogIdsRef.current.delete(dialogId);
          requestDialogHistory(activeIntent, dialogId, 0, { force: true });
        }, 1_500);
      }
    },
    []
  );

  useEffect(() => {
    pendingIntentRef.current = intent;
    dialogIdRef.current = null;
    sessionRef.current = null;
    lastProviderSessionIdRef.current = null;
    loadedDialogIdsRef.current.clear();
    dialogCursorRef.current.clear();
    pendingHistoryCursorRef.current.clear();
    queuedHistoryRefreshRef.current.clear();
    restoreRequestInFlightRef.current.clear();
    setSession(null);
    setSnapshots({});
    setTokenDebugSummaryOverride(undefined);
    latestWorkspaceSnapshotRef.current = null;

    if (!intent) {
      return;
    }

    // Ensure Core scope is selected for this workspace so dialog commands are accepted.
    api.selectWorkspace({
      requestId: createDialogRequestId(),
      workspaceRoot: intent.workspacePath,
      reason: "workspace_selected",
    });

    requestDialogList(intent);
  }, [intent, requestDialogList]);

  useEffect(() => {
    if (!intent) {
      return;
    }
    if (session) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 30;
    const timer = window.setInterval(() => {
      attempts += 1;
      requestDialogList(intent);
      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [intent, requestDialogList, session]);

  useProjectManagerSessionStream({
    onSessionBinding: (payload) => {
      setSession((current) => {
        if (!current || current.id !== payload.sessionId) {
          return current;
        }
        if (
          current.binding.providerSessionId &&
          payload.providerSessionId === null
        ) {
          lastProviderSessionIdRef.current = current.binding.providerSessionId;
        }
        return {
          ...current,
          binding: {
            providerSessionId: payload.providerSessionId,
            status: payload.status,
          },
        };
      });
      setSnapshots((previous) => {
        const current = previous[payload.sessionId];
        if (!current) {
          return previous;
        }
        return {
          ...previous,
          [payload.sessionId]: {
            ...current,
            binding: {
              providerSessionId: payload.providerSessionId,
              status: payload.status,
            },
          },
        };
      });
    },
    onSessionCreated: (created) => {
      const intent = pendingIntentRef.current;
      if (!intent) {
        return;
      }
      setSession((current) => {
        if (!current) {
          return current;
        }

        const isSameWorkspace =
          created.workspacePath === intent.workspacePath ||
          created.workspacePath === current.workspacePath;
        const isSameStage = created.stage === current.stage;
        const isSameRun = created.runSlug === current.runSlug;
        const isSameProvider = created.providerIds[0] === current.providerIds[0];
        const isSameSession = created.id === current.id;
        const isRolloverChild = created.continuationParentId === current.id;
        const currentProviderSessionId = current.binding.providerSessionId;
        const createdProviderSessionId = created.binding.providerSessionId;
        const isRestoreMaterialization =
          current.binding.status !== "ready" &&
          currentProviderSessionId !== null &&
          currentProviderSessionId === createdProviderSessionId;
        const isPostStopRebindSwap =
          current.binding.status !== "ready" &&
          currentProviderSessionId === null &&
          createdProviderSessionId !== null &&
          lastProviderSessionIdRef.current !== null &&
          lastProviderSessionIdRef.current === createdProviderSessionId;
        const shouldAdopt =
          isSameSession ||
          isRolloverChild ||
          isRestoreMaterialization ||
          isPostStopRebindSwap;
        if (
          !(
            isSameWorkspace &&
            isSameStage &&
            isSameRun &&
            isSameProvider &&
            shouldAdopt
          )
        ) {
          return current;
        }

        setSnapshots((previous) => {
          const currentSnapshot = previous[current.id];
          const existingCreatedSnapshot = previous[created.id];
          const carriedMessages =
            existingCreatedSnapshot?.messages.length
              ? existingCreatedSnapshot.messages
              : currentSnapshot?.messages ?? [];
          const carriedTodos =
            existingCreatedSnapshot?.todos.length
              ? existingCreatedSnapshot.todos
              : currentSnapshot?.todos ?? [];
          const labelsForCreated = buildProviderLabels(created.providerIds[0] ?? null);
          const base =
            existingCreatedSnapshot ??
            seedSnapshotWithCachedUsageLimits(
              createInitialSnapshot(
                created,
                labelsForCreated,
                settingsRef.current
              )
            );
          const baseWithModelBinding = applySessionModelBindingToSnapshot(
            base,
            created,
            settingsRef.current
          );
          let next: SessionSnapshots = {
            ...previous,
            [created.id]: {
              ...baseWithModelBinding,
              binding: created.binding,
              messages: carriedMessages,
              todos: carriedTodos,
            },
          };
          if (
            (isRestoreMaterialization || isPostStopRebindSwap) &&
            current.id !== created.id
          ) {
            const { [current.id]: _discarded, ...withoutPlaceholder } = next;
            next = withoutPlaceholder;
          }
          const latest = latestWorkspaceSnapshotRef.current;
          if (latest && latest.workspaceRoot === created.workspacePath) {
            next = applyWorkspaceSnapshotToSnapshots(next, latest);
          }
          return next;
        });

        if (isPostStopRebindSwap) {
          lastProviderSessionIdRef.current = null;
        }
        sessionRef.current = created;
        return created;
      });
    },
    onSessionDeleted: () => {
      // Dialog UI is keyed by dialog history; session lifecycle is tracked via dialog list.
    },
    onSessionHistory: () => {
      // Dialog messages are sourced from dialog history (JSONL), not runtime session history.
    },
    onSessionMessage: () => {
      // Dialog messages are sourced from dialog history (JSONL), not runtime session messages.
    },
    onSessionStream: (payload) => {
      setSnapshots((previous) =>
        updateSnapshotsWithUsageLimits(
          updateSnapshotsWithTokenUsage(
            updateSnapshotsWithTurnState(previous, payload),
            payload
          ),
          payload
        )
      );
      const activeIntent = pendingIntentRef.current;
      const dialogId = dialogIdRef.current;
      if (
        activeIntent &&
        dialogId &&
        shouldRefreshDialogHistoryForStream({
          currentSession: sessionRef.current,
          event: payload.event,
          sessionId: payload.sessionId,
        })
      ) {
        const cursor = dialogCursorRef.current.get(dialogId) ?? 0;
        requestDialogHistory(activeIntent, dialogId, cursor, { force: cursor <= 0 });
        requestDialogList(activeIntent);
      }
    },
    onWorkspaceSnapshot: (payload) => {
      const intent = pendingIntentRef.current;
      if (intent && payload.workspaceRoot === intent.workspacePath) {
        latestWorkspaceSnapshotRef.current = payload;
        const currentDialogId = dialogIdRef.current;
        const currentSession = sessionRef.current;
        if (
          currentDialogId &&
          currentSession &&
          currentSession.id === currentDialogId &&
          currentSession.binding.status !== "ready" &&
          shouldSuppressIdleDialogRestoreRefresh({
            latestSnapshot: payload,
            workspacePath: intent.workspacePath,
            dialogId: currentDialogId,
            providerSessionId: currentSession.binding.providerSessionId,
            preferredSessionId: currentSession.id,
          })
        ) {
          const readySession: SessionRecord = {
            ...currentSession,
            binding: {
              ...currentSession.binding,
              status: "ready",
            },
          };
          sessionRef.current = readySession;
          setSession(readySession);
          setSnapshots((previous) => {
            const snapshot = previous[currentSession.id];
            if (!snapshot) {
              return previous;
            }
            return {
              ...previous,
              [currentSession.id]: {
                ...snapshot,
                binding: readySession.binding,
              },
            };
          });
        }
      }
      setSnapshots((previous) => applyWorkspaceSnapshotToSnapshots(previous, payload));
    },
  });

  useSettingsModelsSync(session ? [session] : [], settings, setSnapshots);

  const showThinkingMessages = resolveSessionThinkingDisplayEnabled({
    providerId: session?.providerIds[0] ?? null,
    settings,
  });

  useProjectManagerDialogCoreEvents({
    applyMessageTranslation: (payload) =>
      setSnapshots((previous) =>
        sessionMessageLocalization.applyMessageTranslation(previous, payload)
      ),
    requestDialogList,
    requestDialogHistory,
    latestWorkspaceSnapshotRef,
    settingsRef,
    sessionRef,
    pendingIntentRef,
    dialogIdRef,
    loadedDialogIdsRef,
    dialogCursorRef,
    pendingHistoryCursorRef,
    queuedHistoryRefreshRef,
    restoreRequestInFlightRef,
    setSession,
    setSnapshots,
    setTokenDebugSummaryOverride,
  });

  const sendMessage = useCallback((content: string, turnOptions?: Record<string, unknown>) => {
    const intent = pendingIntentRef.current;
    const currentDialogId = dialogIdRef.current;
    if (!intent || !currentDialogId) {
      return;
    }
    reload();
    const currentSessionId = sessionRef.current?.id ?? currentDialogId;
    api.dialogs.sendDialogMessage(intent.workspaceSlug, currentDialogId, content, {
      workspacePath: intent.workspacePath,
      ...(turnOptions ? { turnOptions } : {}),
    });
    if (turnOptions?.managedReviewAction) {
      return;
    }
    // Optimistic: render user message immediately instead of waiting for dialog:history:result
    setSnapshots((previous) => appendOptimisticUserMessage(previous, currentSessionId, content));
  }, [reload, setSnapshots]);
  const requestCodexModelSwitch = useCallback((modelId: string) => {
    const currentSession = sessionRef.current;
    if (currentSession?.providerIds[0] !== "codexCli") {
      return;
    }
    api.requestCodexModelSwitch(currentSession.id, modelId);
  }, []);
  const requestLocalModelsModelSwitch = useCallback((modelId: string) => {
    const currentSession = sessionRef.current;
    if (currentSession?.providerIds[0] !== "localModels") {
      return;
    }
    api.requestLocalModelsModelSwitch(currentSession.id, modelId);
  }, []);
  const requestCodexReasoningSwitch = useCallback(
    (reasoning: CodexReasoningLevel) => {
      const currentSession = sessionRef.current;
      if (currentSession?.providerIds[0] !== "codexCli") {
        return;
      }
      api.requestCodexReasoningSwitch(currentSession.id, reasoning);
    },
    []
  );
  const requestClaudeModelSwitch = useCallback(
    (modelId: ClaudeModelAliasId) => {
      const currentSession = sessionRef.current;
      if (currentSession?.providerIds[0] !== "claudeCodeCli") {
        return;
      }
      api.requestClaudeModelSwitch(currentSession.id, modelId);
    },
    []
  );
  const requestClaudeThinkingSwitch = useCallback(
    (thinking: ClaudeThinkingSelection) => {
      const currentSession = sessionRef.current;
      if (currentSession?.providerIds[0] !== "claudeCodeCli") {
        return;
      }
      const thinkingEnabled = thinking !== "off";
      api.requestClaudeThinkingSwitch(
        currentSession.id,
        thinkingEnabled,
        thinkingEnabled ? thinking : undefined
      );
    },
    []
  );
  return {
    connection,
    providerLabels,
    requestCodexModelSwitch,
    requestLocalModelsModelSwitch,
    requestCodexReasoningSwitch,
    requestClaudeModelSwitch,
    requestClaudeThinkingSwitch,
    session,
    showThinkingMessages,
    snapshots,
    setSnapshots,
    tokenDebugSummaryOverride,
    sendMessage,
  };
};
