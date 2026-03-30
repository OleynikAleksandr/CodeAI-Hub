import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { SessionMessage, SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import { workspaceSnapshotStore } from "../../services/workspace-snapshot-store";
import { loadSessionHistories } from "../../../ui/src/core-bridge/session-history";
import { applyBindingToSessionSnapshot, buildProviderLabels, createInitialSnapshot, mergeCatalog, mergeHistoryIntoSnapshots, removeSnapshot, type ProviderCatalog, type SessionSnapshots } from "../../../ui/src/session/helpers";
import { useSettingsModelsSync } from "../../../ui/src/app-host/use-settings-models-sync";
import SessionView from "../../../ui/src/session/session-view";
import { useProjectManagerSettings } from "../settings/use-project-manager-settings";
import { resolveProjectManagerCoreConfig, useProjectManagerCoreStatusHydrator } from "./status-hydrator";
import { useSessionResumeIntent } from "./session-resume-intent";
import { useSessionVisibility } from "./session-visibility";
import { applyWorkspaceSnapshotToSnapshots, useProjectManagerSessionStream } from "./session-stream";
import { appendDedupedSessionMessageToSnapshots } from "./session-message-dedupe";
import { useSessionMessageSender } from "./session-message-sender";
import { updateSnapshotsWithTokenUsage } from "./token-usage-stream";
import { updateSnapshotsWithUsageLimits } from "./usage-limits-stream";
import { normalizeSessionHistoryMessages, resolveMostRecentVisibleSessionId, resolveMostRecentWorkspaceSessionId } from "./runtime-session-auto-select";
import { useRuntimeModelSync } from "./use-runtime-model-sync";
type ProjectManagerSessionViewProps = {
  readonly workspacePath?: string;
  readonly preferredSessionId?: string | null;
  readonly emptyStatePending?: boolean;
};
const ProjectManagerRuntimeSessionView = ({
  workspacePath,
  preferredSessionId,
  emptyStatePending = false,
}: ProjectManagerSessionViewProps) => {
  const [providerCatalog, setProviderCatalog] = useState<ProviderCatalog>({});
  const providerLabels = useMemo(() => buildProviderLabels(providerCatalog), [providerCatalog]);
  const { settings, reload } = useProjectManagerSettings();
  const [sessions, setSessions] = useState<readonly SessionRecord[]>([]);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const forcedHiddenSessionIds = useMemo<ReadonlySet<string>>(
    () => new Set(),
    []
  );
  const loadedHistorySessionIdsRef = useRef<Set<string>>(new Set());
  const sessionsRef = useRef<readonly SessionRecord[]>([]);
  const syncSessionsRef = useCallback((current: readonly SessionRecord[]) => {
    sessionsRef.current = current;
  }, []);
  const { hideSession, removeHiddenSession, showSession, visibleSessions } = useSessionVisibility(
    {
      sessions,
      sessionsRef,
      workspacePath,
      forcedHiddenSessionIds,
      setActiveSessionId,
    }
  );
  const hydrateFromState = useCallback(
    (payload: {
      readonly providers: readonly ProviderStackDescriptor[];
      readonly sessions: readonly SessionRecord[];
    }) => {
      setProviderCatalog((current) => {
        const merged = mergeCatalog(current, payload.providers);
        const labels = buildProviderLabels(merged);
        const nextSessions = [...payload.sessions];
        syncSessionsRef(nextSessions);
        setSessions(nextSessions);
        const nextSnapshots: SessionSnapshots = {};
        for (const session of nextSessions) {
          nextSnapshots[session.id] = createInitialSnapshot(
            session,
            labels,
            settings
          );
        }
        setSnapshots(() => { const snapshotState = workspaceSnapshotStore.getState(); if (workspacePath && snapshotState.activeWorkspaceRoot === workspacePath && snapshotState.currentSnapshot?.workspaceRoot === workspacePath) { return applyWorkspaceSnapshotToSnapshots(nextSnapshots, { workspaceRoot: snapshotState.currentSnapshot.workspaceRoot, selectionId: snapshotState.activeSelectionId ?? "__rehydrate__", sequence: snapshotState.lastAppliedSequence > 0 ? snapshotState.lastAppliedSequence : 1, generatedAt: new Date().toISOString(), snapshot: snapshotState.currentSnapshot }); } return nextSnapshots; });
        setActiveSessionId(
          (currentActive) =>
            currentActive ??
            resolveMostRecentWorkspaceSessionId({
              sessions: nextSessions,
              workspacePath,
            })
        );
        return merged;
      });
    },
    [settings, syncSessionsRef, workspacePath]
  );
  const handleSessionHistory = useCallback(
    (payload: { readonly sessionId: string; readonly messages: readonly unknown[] }) => {
      const normalized = normalizeSessionHistoryMessages(payload.messages);
      loadedHistorySessionIdsRef.current.add(payload.sessionId);
      setSnapshots((previous) =>
        mergeHistoryIntoSnapshots(previous, {
          sessionId: payload.sessionId,
          messages: normalized,
        })
      );
    },
    []
  );
  const handleSessionCreated = useCallback(
    (session: SessionRecord) => {
      const isInScope = Boolean(workspacePath) && session.workspacePath === workspacePath;
      if (isInScope) {
        showSession(session.id);
      }
      setSessions((previous) => {
        const next =
          previous.some((candidate) => candidate.id === session.id)
            ? previous.map((candidate) =>
                candidate.id === session.id ? session : candidate
              )
            : [...previous, session];
        syncSessionsRef(next);
        return next;
      });
      setSnapshots((previous) => {
        const existing = previous[session.id];
        if (existing) {
          return {
            ...previous,
            [session.id]: applyBindingToSessionSnapshot(existing, session.binding),
          };
        }
        return {
          ...previous,
          [session.id]: createInitialSnapshot(session, providerLabels, settings),
        };
      });
      if (isInScope) {
        setActiveSessionId(session.id);
      }
      const config = resolveProjectManagerCoreConfig();
      if (!config) {
        return;
      }
      if (loadedHistorySessionIdsRef.current.has(session.id)) {
        return;
      }
      loadSessionHistories(config, [session], (payload) => {
        handleSessionHistory(payload);
      }).catch(() => {
        // ignore
      });
    },
    [
      handleSessionHistory,
      providerLabels,
      settings,
      showSession,
      syncSessionsRef,
      workspacePath,
    ]
  );
  const handleSessionMessage = useCallback(
    (payload: { readonly sessionId: string; readonly message: SessionMessage }) => {
      setSnapshots((previous) =>
        appendDedupedSessionMessageToSnapshots(previous, payload)
      );
    },
    []
  );
  const handleSessionDeleted = useCallback(
    (sessionId: string) => {
      setSessions((previous) => {
        const next = previous.filter((session) => session.id !== sessionId);
        syncSessionsRef(next);
        return next;
      });
      setSnapshots((previous) => removeSnapshot(previous, sessionId));
      removeHiddenSession(sessionId);
      setActiveSessionId((current) =>
        current !== sessionId
          ? current
          : sessionsRef.current.filter((session) => session.id !== sessionId).at(-1)?.id ??
            null
      );
    },
    [removeHiddenSession, syncSessionsRef]
  );
  const handleSessionBinding = useCallback(
    (payload: {
      readonly sessionId: string;
      readonly providerSessionId: string | null;
      readonly status: "pending" | "ready" | "failed";
    }) => {
      setSessions((current) =>
        current.map((session) =>
          session.id === payload.sessionId
            ? {
                ...session,
                binding: {
                  providerSessionId: payload.providerSessionId,
                  status: payload.status,
                },
              }
            : session
        )
      );
      setSnapshots((previous) => {
        const current = previous[payload.sessionId];
        if (!current) {
          return previous;
        }
        return {
          ...previous,
          [payload.sessionId]: applyBindingToSessionSnapshot(current, {
            providerSessionId: payload.providerSessionId,
            status: payload.status,
          }),
        };
      });
    },
    []
  );
  useProjectManagerSessionStream({
    onSessionBinding: handleSessionBinding,
    onSessionCreated: handleSessionCreated,
    onSessionDeleted: handleSessionDeleted,
    onSessionHistory: handleSessionHistory,
    onSessionMessage: handleSessionMessage,
    onSessionStream: (payload) =>
      setSnapshots((previous) =>
        updateSnapshotsWithUsageLimits(updateSnapshotsWithTokenUsage(previous, payload), payload)
      ),
    onWorkspaceSnapshot: (payload) => {
      workspaceSnapshotStore.applySnapshot(payload);
      setSnapshots((previous) => applyWorkspaceSnapshotToSnapshots(previous, payload));
    },
  });
  const connection = useProjectManagerCoreStatusHydrator({
    onHydrate: hydrateFromState,
    onSessionHistory: handleSessionHistory,
  });
  useEffect(() => {
    if (!preferredSessionId) {
      return;
    }
    setActiveSessionId(preferredSessionId);
  }, [preferredSessionId]);
  useEffect(() => {
    if (!activeSessionId) {
      setActiveSessionId(resolveMostRecentVisibleSessionId(visibleSessions));
      return;
    }
    // Keep preferred session even if not yet in visibleSessions —
    // Core stream delivers session:created after preferredSessionId is set.
    if (preferredSessionId && activeSessionId === preferredSessionId) {
      return;
    }
    const isVisible = visibleSessions.some((session) => session.id === activeSessionId);
    if (!(forcedHiddenSessionIds.has(activeSessionId) || !isVisible)) {
      return;
    }
    setActiveSessionId(resolveMostRecentVisibleSessionId(visibleSessions));
  }, [activeSessionId, forcedHiddenSessionIds, preferredSessionId, visibleSessions]);
  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    reload();
  }, [activeSessionId, reload]);
  useSettingsModelsSync(sessions, settings, setSnapshots);
  useRuntimeModelSync(activeSessionId, setSnapshots);
  useSessionResumeIntent({
    sessionsRef,
    focusSession: (sessionId) => {
      showSession(sessionId);
      setActiveSessionId(sessionId);
    },
    createSession: api.createSession,
  });
  const isPreferredPending = Boolean(preferredSessionId && activeSessionId === preferredSessionId && !visibleSessions.some((s) => s.id === activeSessionId));
  const scopedActiveSessionId = isPreferredPending || visibleSessions.some((session) => session.id === activeSessionId) ? activeSessionId : null;
  const handleSendMessage = useSessionMessageSender(
    sessionsRef,
    workspacePath,
    reload
  );
  return (
    <SessionView
      activeSessionId={scopedActiveSessionId}
      allSessions={sessions}
      coreConnectionDetail={connection.detail}
      coreConnectionStatus={connection.status}
      onCloseSession={hideSession}
      onSelectSession={setActiveSessionId}
      onSendMessage={handleSendMessage}
      emptyStatePending={emptyStatePending}
      providerLabels={providerLabels}
      sessions={visibleSessions}
      showEmptyState={Boolean(workspacePath)}
      snapshots={snapshots}
    />
  );
};
export default ProjectManagerRuntimeSessionView;
