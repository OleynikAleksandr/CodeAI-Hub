import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { SessionMessage, SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import { workspaceSnapshotStore } from "../../services/workspace-snapshot-store";
import { sanitizeMessage } from "../../../ui/src/core-bridge/normalizers";
import { loadSessionHistories } from "../../../ui/src/core-bridge/session-history";
import {
  buildProviderLabels,
  createInitialSnapshot,
  mergeCatalog,
  mergeHistoryIntoSnapshots,
  removeSnapshot,
  type ProviderCatalog,
  type SessionSnapshots,
} from "../../../ui/src/session/helpers";
import { useSettingsModelsSync } from "../../../ui/src/app-host/use-settings-models-sync";
import SessionView from "../../../ui/src/session/session-view";
import { useProjectManagerSettings } from "../settings/use-project-manager-settings";
import { resolveProjectManagerCoreConfig, useProjectManagerCoreStatusHydrator } from "./status-hydrator";
import { useSessionResumeIntent } from "./session-resume-intent";
import { useSessionVisibility } from "./session-visibility";
import { applyWorkspaceSnapshotToSnapshots, useProjectManagerSessionStream } from "./session-stream";
import { useReviewerSessionVisibility } from "./reviewer-session-visibility";
import { appendDedupedSessionMessageToSnapshots } from "./session-message-dedupe";
import { useSessionMessageSender } from "./session-message-sender";
import { updateSnapshotsWithTokenUsage } from "./token-usage-stream";
import { updateSnapshotsWithUsageLimits } from "./usage-limits-stream";
type ProjectManagerSessionViewProps = {
  readonly workspacePath?: string;
  readonly preferredSessionId?: string | null;
};
export const ProjectManagerRuntimeSessionView = ({
  workspacePath,
  preferredSessionId,
}: ProjectManagerSessionViewProps) => {
  const [providerCatalog, setProviderCatalog] = useState<ProviderCatalog>({});
  const providerLabels = useMemo(() => buildProviderLabels(providerCatalog), [providerCatalog]);
  const { settings } = useProjectManagerSettings();
  const [sessions, setSessions] = useState<readonly SessionRecord[]>([]);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const loadedHistorySessionIdsRef = useRef<Set<string>>(new Set());
  const sessionsRef = useRef<readonly SessionRecord[]>([]);
  const syncSessionsRef = useCallback((current: readonly SessionRecord[]) => {
    sessionsRef.current = current;
  }, []);
  const { forcedHiddenSessionIds, reviewerSessionId } = useReviewerSessionVisibility({
    sessions,
    workspacePath,
  });
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
        setSnapshots(nextSnapshots);
        setActiveSessionId(
          (currentActive) => currentActive ?? nextSessions.at(-1)?.id ?? null
        );
        return merged;
      });
    },
    [settings, syncSessionsRef]
  );
  const handleSessionHistory = useCallback(
    (payload: { readonly sessionId: string; readonly messages: readonly unknown[] }) => {
      const normalized: SessionMessage[] = [];
      for (const message of payload.messages) {
        const converted = sanitizeMessage(message as never);
        if (converted) {
          normalized.push(converted);
        }
      }
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
            [session.id]: {
              ...existing,
              binding: session.binding,
            },
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
      // workspace:snapshot is authoritative for runtime lock lifecycle in PM.
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
    if (!reviewerSessionId) {
      return;
    }
    showSession(reviewerSessionId);
  }, [reviewerSessionId, showSession]);
  useEffect(() => {
    if (!activeSessionId) {
      setActiveSessionId(visibleSessions.at(-1)?.id ?? null);
      return;
    }
    const isVisible = visibleSessions.some((session) => session.id === activeSessionId);
    if (!(forcedHiddenSessionIds.has(activeSessionId) || !isVisible)) {
      return;
    }
    setActiveSessionId(visibleSessions.at(-1)?.id ?? null);
  }, [activeSessionId, forcedHiddenSessionIds, visibleSessions]);
  useSettingsModelsSync(sessions, settings, setSnapshots);
  useSessionResumeIntent({
    sessionsRef,
    focusSession: (sessionId) => {
      showSession(sessionId);
      setActiveSessionId(sessionId);
    },
    createSession: api.createSession,
  });
  const scopedActiveSessionId =
    visibleSessions.some((session) => session.id === activeSessionId) ? activeSessionId : null;
  const handleSendMessage = useSessionMessageSender(sessionsRef, workspacePath);
  return (
    <SessionView
      activeSessionId={scopedActiveSessionId}
      allSessions={sessions}
      coreConnectionDetail={connection.detail}
      coreConnectionStatus={connection.status}
      onCloseSession={hideSession}
      onSelectSession={setActiveSessionId}
      onSendMessage={handleSendMessage}
      providerLabels={providerLabels}
      sessions={visibleSessions}
      showEmptyState={Boolean(workspacePath)}
      snapshots={snapshots}
    />
  );
};
export default ProjectManagerRuntimeSessionView;
