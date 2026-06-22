import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../types/claude-model-registry";
import type { CodexReasoningLevel } from "../../../../types/codex-model-registry";
import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { SessionMessage, SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import { isDisplayOnlyKimiModelSwitch } from "../../services/switch-api";
import { workspaceSnapshotStore } from "../../services/workspace-snapshot-store";
import { loadSessionHistories } from "../../../ui/src/core-bridge/session-history";
import type { FileLinkTarget } from "../../../ui/src/session/file-link-target";
import { applyBindingToSessionSnapshot, applySessionModelBindingToSnapshot, buildProviderLabels, createInitialSnapshot, mergeCatalog, mergeHistoryIntoSnapshots, removeSnapshot, resolveSessionThinkingDisplayEnabled, type ProviderCatalog, type SessionSnapshots } from "../../../ui/src/session/helpers";
import { SessionMessageLocalizationFacade } from "../../../ui/src/session/session-message-localization-facade";
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
import { updateSnapshotsWithTurnState } from "./turn-state-stream";
import {
  seedSnapshotWithCachedUsageLimits,
  updateSnapshotsWithUsageLimits,
} from "./usage-limits-stream";
import { normalizeSessionHistoryMessages, resolveMostRecentVisibleSessionId, resolveMostRecentWorkspaceSessionId } from "./runtime-session-auto-select";
import { useRuntimeModelSync } from "./use-runtime-model-sync";

type ProjectManagerSessionViewProps = {
  readonly workspacePath?: string;
  readonly preferredSessionId?: string | null;
  readonly emptyStatePending?: boolean;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
  readonly startupStage?: string | null;
  readonly visibleSessionId?: string | null;
};

type ClaudeThinkingSelection = ClaudeThinkingEffort | "off";


const ProjectManagerRuntimeSessionView = ({
  workspacePath,
  preferredSessionId,
  emptyStatePending = false,
  onFileLinkActivate,
  startupStage = "description",
  visibleSessionId = null,
}: ProjectManagerSessionViewProps) => {
  const sessionMessageLocalization = useMemo(
    () => new SessionMessageLocalizationFacade(),
    []
  );
  const [providerCatalog, setProviderCatalog] = useState<ProviderCatalog>({});
  const providerLabels = useMemo(() => buildProviderLabels(providerCatalog), [providerCatalog]);
  const { settings, reload } = useProjectManagerSettings();
  const [sessions, setSessions] = useState<readonly SessionRecord[]>([]);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionScopeStage, setSessionScopeStage] = useState<string | null>(
    startupStage
  );
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
      visibleStage: sessionScopeStage,
      forcedHiddenSessionIds,
      setActiveSessionId,
    }
  );
  const visibleSessionsForView = useMemo(
    () =>
      visibleSessionId
        ? visibleSessions.filter((session) => session.id === visibleSessionId)
        : visibleSessions,
    [visibleSessionId, visibleSessions]
  );
  const isSessionInViewScope = useCallback(
    (session: SessionRecord): boolean => {
      if (!workspacePath || session.workspacePath !== workspacePath) {
        return false;
      }
      if (visibleSessionId) {
        return session.id === visibleSessionId;
      }
      return session.stage === sessionScopeStage;
    },
    [sessionScopeStage, visibleSessionId, workspacePath]
  );
  const hydrateFromState = useCallback(
    (payload: {
      readonly providers: readonly ProviderStackDescriptor[];
      readonly sessions: readonly SessionRecord[];
    }) => {
      setProviderCatalog((current) => {
        const merged = mergeCatalog(current, payload.providers);
        const labels = buildProviderLabels(merged);
        const nextSessions = payload.sessions.filter(isSessionInViewScope);
        if (visibleSessionId && nextSessions.length === 0) {
          return merged;
        }
        syncSessionsRef(nextSessions);
        setSessions(nextSessions);
        const nextSnapshots: SessionSnapshots = {};
        for (const session of nextSessions) {
          nextSnapshots[session.id] = seedSnapshotWithCachedUsageLimits(
            createInitialSnapshot(
              session,
              labels,
              settings
            )
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
    [isSessionInViewScope, settings, syncSessionsRef, visibleSessionId, workspacePath]
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
      const isInScope = isSessionInViewScope(session);
      if (!isInScope) {
        return;
      }
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
          const withBinding = applyBindingToSessionSnapshot(
            existing,
            session.binding
          );
          return {
            ...previous,
            [session.id]: applySessionModelBindingToSnapshot(
              withBinding,
              session,
              settings
            ),
          };
        }
        return {
          ...previous,
          [session.id]: seedSnapshotWithCachedUsageLimits(
            createInitialSnapshot(session, providerLabels, settings)
          ),
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
      isSessionInViewScope,
      settings,
      showSession,
      syncSessionsRef,
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
    onSessionMessageTranslation: (payload) =>
      setSnapshots((previous) =>
        sessionMessageLocalization.applyMessageTranslation(previous, payload)
      ),
    onSessionStream: (payload) =>
      setSnapshots((previous) =>
        updateSnapshotsWithUsageLimits(
          updateSnapshotsWithTokenUsage(
            updateSnapshotsWithTurnState(previous, payload),
            payload
          ),
          payload
        )
      ),
    onWorkspaceSnapshot: (payload) => {
      workspaceSnapshotStore.applySnapshot(payload);
      setSnapshots((previous) => applyWorkspaceSnapshotToSnapshots(previous, payload));
    },
  });
  const connection = useProjectManagerCoreStatusHydrator({
    onHydrate: hydrateFromState,
    onSessionHistory: handleSessionHistory,
    rehydrateOnCoreState: !visibleSessionId,
  });
  useEffect(() => {
    if (!preferredSessionId) {
      return;
    }
    setActiveSessionId(preferredSessionId);
  }, [preferredSessionId]);
  useEffect(() => {
    if (!activeSessionId) {
      setActiveSessionId(
        resolveMostRecentVisibleSessionId(visibleSessionsForView)
      );
      return;
    }
    // Keep preferred session even if not yet in visibleSessions —
    // Core stream delivers session:created after preferredSessionId is set.
    if (preferredSessionId && activeSessionId === preferredSessionId) {
      return;
    }
    const isVisible = visibleSessionsForView.some((session) => session.id === activeSessionId);
    if (!(forcedHiddenSessionIds.has(activeSessionId) || !isVisible)) {
      return;
    }
    setActiveSessionId(resolveMostRecentVisibleSessionId(visibleSessionsForView));
  }, [activeSessionId, forcedHiddenSessionIds, preferredSessionId, visibleSessionsForView]);
  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    reload();
  }, [activeSessionId, reload]);
  useEffect(() => {
    setSessionScopeStage(startupStage);
  }, [startupStage, workspacePath]);
  useEffect(() => {
    const handleDialogIntent = (
      event: Event
    ) => {
      const detail = (
        event as CustomEvent<{
          readonly workspacePath?: string;
          readonly stage?: string | null;
        }>
      ).detail;
      if (detail?.workspacePath !== workspacePath) {
        return;
      }
      setSessionScopeStage((current) =>
        typeof detail.stage === "string"
          ? detail.stage
          : current ?? startupStage ?? null
      );
    };
    const handleStageActivated = (
      event: Event
    ) => {
      const stage = (event as CustomEvent<{ readonly stage?: string }>).detail?.stage;
      if (typeof stage === "string") {
        setSessionScopeStage(stage);
      }
    };
    window.addEventListener("pm:dialog:open", handleDialogIntent);
    window.addEventListener("pm:stage:activated", handleStageActivated);
    return () => {
      window.removeEventListener("pm:dialog:open", handleDialogIntent);
      window.removeEventListener("pm:stage:activated", handleStageActivated);
    };
  }, [startupStage, workspacePath]);
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
  const isPreferredPending = Boolean(preferredSessionId && activeSessionId === preferredSessionId && !visibleSessionsForView.some((s) => s.id === activeSessionId));
  const scopedActiveSessionId = isPreferredPending || visibleSessionsForView.some((session) => session.id === activeSessionId) ? activeSessionId : null;
  const handleSendMessage = useSessionMessageSender(
    sessionsRef,
    workspacePath,
    reload
  );
  const handleSelectModel = useCallback(
    (sessionId: string, modelId: string) => {
      const session = sessionsRef.current.find(
        (candidate) => candidate.id === sessionId
      );
      const providerId = session?.providerIds[0] ?? null;
      if (isDisplayOnlyKimiModelSwitch({ providerId, targetModelId: modelId })) {
        return;
      }
      if (providerId !== "codexCli") {
        return;
      }
      api.requestCodexModelSwitch(sessionId, modelId);
    },
    []
  );
  const handleSelectReasoning = useCallback(
    (sessionId: string, reasoning: CodexReasoningLevel) => {
      const session = sessionsRef.current.find(
        (candidate) => candidate.id === sessionId
      );
      if (session?.providerIds[0] !== "codexCli") {
        return;
      }
      api.requestCodexReasoningSwitch(sessionId, reasoning);
    },
    []
  );
  const handleSelectClaudeModel = useCallback(
    (sessionId: string, modelId: ClaudeModelAliasId) => {
      const session = sessionsRef.current.find(
        (candidate) => candidate.id === sessionId
      );
      if (session?.providerIds[0] !== "claudeCodeCli") {
        return;
      }
      api.requestClaudeModelSwitch(sessionId, modelId);
    },
    []
  );
  const handleSelectClaudeThinking = useCallback(
    (sessionId: string, thinking: ClaudeThinkingSelection) => {
      const session = sessionsRef.current.find(
        (candidate) => candidate.id === sessionId
      );
      if (session?.providerIds[0] !== "claudeCodeCli") {
        return;
      }
      const thinkingEnabled = thinking !== "off";
      api.requestClaudeThinkingSwitch(
        sessionId,
        thinkingEnabled,
        thinkingEnabled ? thinking : undefined
      );
    },
    []
  );
  const activeRecord = sessions.find((session) => session.id === scopedActiveSessionId) ?? null;
  const showThinkingMessages = resolveSessionThinkingDisplayEnabled({
    providerId: activeRecord?.providerIds[0] ?? null,
    settings,
  });
  return (
    <SessionView
      activeSessionId={scopedActiveSessionId}
      allSessions={sessions}
      coreConnectionDetail={connection.detail}
      coreConnectionStatus={connection.status}
      onCloseSession={hideSession}
      onFileLinkActivate={onFileLinkActivate}
      onSelectClaudeModel={handleSelectClaudeModel}
      onSelectClaudeThinking={handleSelectClaudeThinking}
      onSelectModel={handleSelectModel}
      onSelectReasoning={handleSelectReasoning}
      onSelectSession={setActiveSessionId}
      onSendMessage={handleSendMessage}
      emptyStatePending={emptyStatePending}
      providerLabels={providerLabels}
      sessions={visibleSessionsForView}
      showThinkingMessages={showThinkingMessages}
      showEmptyState={Boolean(workspacePath)}
      snapshots={snapshots}
    />
  );
};
export default ProjectManagerRuntimeSessionView;
