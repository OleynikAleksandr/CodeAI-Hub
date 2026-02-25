import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";
import { useProjectManagerCoreStatusHydrator } from "./status-hydrator";
import {
  createInitialSnapshot,
  type SessionSnapshots,
} from "../../../ui/src/session/helpers";
import { useSettingsModelsSync } from "../../../ui/src/app-host/use-settings-models-sync";
import {
  buildProviderLabels,
  createDialogRequestId,
  type DialogOpenIntent,
} from "./project-manager-dialog-session-view-helpers";
import { useProjectManagerSettings } from "../settings/use-project-manager-settings";
import {
  applyWorkspaceSnapshotToSnapshots,
  useProjectManagerSessionStream,
} from "./session-stream";
import { updateSnapshotsWithTokenUsage } from "./token-usage-stream";
import { updateSnapshotsWithUsageLimits } from "./usage-limits-stream";
import { useProjectManagerDialogCoreEvents } from "./use-project-manager-dialog-core-events";

type DialogHistoryRequestOptions = { readonly force?: boolean } | null | undefined;

export type ProjectManagerDialogSessionController = {
  readonly connection: ReturnType<typeof useProjectManagerCoreStatusHydrator>;
  readonly providerLabels: ReturnType<typeof buildProviderLabels>;
  readonly session: SessionRecord | null;
  readonly snapshots: SessionSnapshots;
  readonly tokenDebugSummaryOverride: string | undefined;
  readonly sendMessage: (content: string) => void;
};

export const useProjectManagerDialogSessionController = (
  intent: DialogOpenIntent | null
): ProjectManagerDialogSessionController => {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const [tokenDebugSummaryOverride, setTokenDebugSummaryOverride] = useState<
    string | undefined
  >(undefined);
  const latestWorkspaceSnapshotRef = useRef<WorkspaceSnapshotPushPayload | null>(
    null
  );

  const loadedDialogIdsRef = useRef(new Set<string>());
  const dialogCursorRef = useRef(new Map<string, number>());
  const pendingHistoryCursorRef = useRef(new Map<string, number>());
  const queuedHistoryRefreshRef = useRef(new Set<string>());
  const pendingIntentRef = useRef<DialogOpenIntent | null>(null);
  const dialogIdRef = useRef<string | null>(null);

  const { settings } = useProjectManagerSettings();
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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
    api.dialogs.listDialogs(intent.workspaceSlug);
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

      api.dialogs.requestDialogHistory(
        intent.workspaceSlug,
        dialogId,
        resolvedCursor > 0 ? { cursor: resolvedCursor } : undefined
      );

      pendingHistoryCursorRef.current.set(dialogId, resolvedCursor);
    },
    []
  );

  useEffect(() => {
    pendingIntentRef.current = intent;
    dialogIdRef.current = null;
    loadedDialogIdsRef.current.clear();
    dialogCursorRef.current.clear();
    pendingHistoryCursorRef.current.clear();
    queuedHistoryRefreshRef.current.clear();
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

        const isSameWorkspace = created.workspacePath === intent.workspacePath;
        const isRolloverChild = created.continuationParentId === current.id;
        const isSameStage = created.stage === current.stage;
        const isSameRun = created.runSlug === current.runSlug;
        if (!(isSameWorkspace && isRolloverChild && isSameStage && isSameRun)) {
          return current;
        }

        setSnapshots((previous) => {
          if (previous[created.id]) {
            return previous;
          }
          const carriedMessages = previous[current.id]?.messages ?? [];
          const carriedTodos = previous[current.id]?.todos ?? [];
          const labelsForCreated = buildProviderLabels(created.providerIds[0] ?? null);
          const base = createInitialSnapshot(created, labelsForCreated, settingsRef.current);
          let next: SessionSnapshots = {
            ...previous,
            [created.id]: {
              ...base,
              messages: carriedMessages,
              todos: carriedTodos,
            },
          };
          const latest = latestWorkspaceSnapshotRef.current;
          if (latest && latest.workspaceRoot === created.workspacePath) {
            next = applyWorkspaceSnapshotToSnapshots(next, latest);
          }
          return next;
        });

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
        updateSnapshotsWithUsageLimits(updateSnapshotsWithTokenUsage(previous, payload), payload)
      );
    },
    onWorkspaceSnapshot: (payload) => {
      const intent = pendingIntentRef.current;
      if (intent && payload.workspaceRoot === intent.workspacePath) {
        latestWorkspaceSnapshotRef.current = payload;
      }
      setSnapshots((previous) => applyWorkspaceSnapshotToSnapshots(previous, payload));
    },
  });

  useSettingsModelsSync(session ? [session] : [], settings, setSnapshots);

  useProjectManagerDialogCoreEvents({
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
    setSession,
    setSnapshots,
    setTokenDebugSummaryOverride,
  });

  const sendMessage = useCallback((content: string) => {
    const intent = pendingIntentRef.current;
    const currentDialogId = dialogIdRef.current;
    if (!intent || !currentDialogId) {
      return;
    }
    api.dialogs.sendDialogMessage(intent.workspaceSlug, currentDialogId, content);
  }, []);

  return {
    connection,
    providerLabels,
    session,
    snapshots,
    tokenDebugSummaryOverride,
    sendMessage,
  };
};
