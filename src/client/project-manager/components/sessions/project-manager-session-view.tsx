import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { SessionMessage, SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import { sanitizeMessage } from "../../../ui/src/core-bridge/normalizers";
import {
  buildProviderLabels,
  createInitialSnapshot,
  mergeCatalog,
  mergeHistoryIntoSnapshots,
  removeSnapshot,
  type ProviderCatalog,
  type SessionSnapshots,
  toggleTodoInSnapshots,
} from "../../../ui/src/session/helpers";
import SessionView from "../../../ui/src/session/session-view";
import { loadIdeaCollectorSchemaForProjectManager } from "../../services/idea-collector-submit-service";
import { useProjectManagerCoreStatusHydrator } from "./status-hydrator";
import { useProjectManagerSessionStream } from "./session-stream";

type ProjectManagerSessionViewProps = {
  readonly workspacePath?: string;
  readonly preferredSessionId?: string | null;
};

const DEFAULT_PROVIDER_CATALOG: ProviderCatalog = {};

export const ProjectManagerSessionView = ({
  workspacePath,
  preferredSessionId,
}: ProjectManagerSessionViewProps) => {
  const [providerCatalog, setProviderCatalog] = useState<ProviderCatalog>(
    DEFAULT_PROVIDER_CATALOG
  );
  const providerLabels = useMemo(
    () => buildProviderLabels(providerCatalog),
    [providerCatalog]
  );

  const [sessions, setSessions] = useState<readonly SessionRecord[]>([]);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const sessionsRef = useRef<readonly SessionRecord[]>([]);

  const syncSessionsRef = useCallback((current: readonly SessionRecord[]) => {
    sessionsRef.current = current;
  }, []);

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
          nextSnapshots[session.id] = createInitialSnapshot(session, labels);
        }
        setSnapshots(nextSnapshots);

        setActiveSessionId(
          (currentActive) => currentActive ?? nextSessions.at(-1)?.id ?? null
        );

        return merged;
      });
    },
    [syncSessionsRef]
  );

  const handleSessionCreated = useCallback(
    (session: SessionRecord) => {
      setSessions((previous) => {
        const next = [...previous, session];
        syncSessionsRef(next);
        return next;
      });
      setSnapshots((previous) => ({
        ...previous,
        [session.id]: createInitialSnapshot(session, providerLabels),
      }));
      setActiveSessionId(session.id);
    },
    [providerLabels, syncSessionsRef]
  );

  const handleSessionMessage = useCallback(
    (payload: { readonly sessionId: string; readonly message: SessionMessage }) => {
      setSnapshots((previous) => {
        const snapshot = previous[payload.sessionId];
        if (!snapshot) {
          return previous;
        }
        return {
          ...previous,
          [payload.sessionId]: {
            ...snapshot,
            messages: [...snapshot.messages, payload.message],
          },
        };
      });
    },
    []
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
      setSnapshots((previous) =>
        mergeHistoryIntoSnapshots(previous, {
          sessionId: payload.sessionId,
          messages: normalized,
        })
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
      setActiveSessionId((current) => {
        if (current !== sessionId) {
          return current;
        }
        const remaining = sessionsRef.current.filter(
          (session) => session.id !== sessionId
        );
        return remaining.at(-1)?.id ?? null;
      });
    },
    [syncSessionsRef]
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

  const visibleSessions = useMemo(() => {
    if (!workspacePath) {
      return [];
    }
    return sessions.filter((session) => session.workspacePath === workspacePath);
  }, [sessions, workspacePath]);

  const showEmptyState = Boolean(workspacePath);

  const handleCloseSession = useCallback((sessionId: string) => {
    api.deleteSession(sessionId);
  }, []);

  const handleSendMessage = useCallback(
    (sessionId: string, content: string) => {
      const record = sessionsRef.current.find(
        (session) => session.id === sessionId
      );
      if (record?.stage !== "idea") {
        api.sendSessionMessage(sessionId, content);
        return;
      }

      void loadIdeaCollectorSchemaForProjectManager()
        .then((schema) => {
          api.sendSessionMessage(sessionId, content, { outputSchema: schema });
        })
        .catch(() => {
          api.sendSessionMessage(sessionId, content);
        });
    },
    []
  );

  const handleToggleTodo = useCallback((sessionId: string, todoId: string) => {
    setSnapshots((previous) =>
      toggleTodoInSnapshots(previous, sessionId, todoId)
    );
  }, []);

  return (
    <SessionView
      activeSessionId={activeSessionId}
      coreConnectionDetail={connection.detail}
      coreConnectionStatus={connection.status}
      onCloseSession={handleCloseSession}
      onSelectSession={setActiveSessionId}
      onSendMessage={handleSendMessage}
      onToggleTodo={handleToggleTodo}
      providerLabels={providerLabels}
      sessions={visibleSessions}
      showEmptyState={showEmptyState}
      snapshots={snapshots}
    />
  );
};
