import {
  useCallback,
  useMemo,
  useState,
  type MutableRefObject,
} from "react";
import type { SessionRecord } from "../../../../types/session";

export const useSessionVisibility = (params: {
  readonly sessions: readonly SessionRecord[];
  readonly sessionsRef: MutableRefObject<readonly SessionRecord[]>;
  readonly workspacePath?: string;
  readonly visibleStage?: string | null;
  readonly forcedHiddenSessionIds?: ReadonlySet<string>;
  readonly setActiveSessionId: (
    next:
      | string
      | null
      | ((current: string | null) => string | null)
  ) => void;
}) => {
  const [hiddenSessionIds, setHiddenSessionIds] = useState<Set<string>>(
    () => new Set()
  );

  const showSession = useCallback((sessionId: string) => {
    if (params.forcedHiddenSessionIds?.has(sessionId)) {
      return;
    }
    setHiddenSessionIds((current) => {
      if (!current.has(sessionId)) {
        return current;
      }
      const next = new Set(current);
      next.delete(sessionId);
      return next;
    });
  }, []);

  const hideSession = useCallback(
    (sessionId: string) => {
      setHiddenSessionIds((current) => {
        if (current.has(sessionId)) {
          return current;
        }
        const next = new Set(current);
        next.add(sessionId);
        params.setActiveSessionId((currentActive) => {
          if (currentActive !== sessionId) {
            return currentActive;
          }
          const remaining = params.sessionsRef.current.filter(
            (session) =>
              session.workspacePath === params.workspacePath &&
              (params.visibleStage === null ||
                params.visibleStage === undefined ||
                session.stage === params.visibleStage) &&
              session.id !== sessionId &&
              !next.has(session.id)
          );
          return remaining.at(-1)?.id ?? null;
        });
        return next;
      });
    },
    [
      params.sessionsRef,
      params.setActiveSessionId,
      params.visibleStage,
      params.workspacePath,
    ]
  );

  const removeHiddenSession = useCallback((sessionId: string) => {
    setHiddenSessionIds((current) => {
      if (!current.has(sessionId)) {
        return current;
      }
      const next = new Set(current);
      next.delete(sessionId);
      return next;
    });
  }, []);

  const visibleSessions = useMemo(() => {
    if (!params.workspacePath) {
      return [];
    }
    return params.sessions.filter(
      (session) =>
        session.workspacePath === params.workspacePath &&
        (params.visibleStage === null ||
          params.visibleStage === undefined ||
          session.stage === params.visibleStage) &&
        !hiddenSessionIds.has(session.id) &&
        !params.forcedHiddenSessionIds?.has(session.id)
    );
  }, [
    params.sessions,
    params.workspacePath,
    params.visibleStage,
    params.forcedHiddenSessionIds,
    hiddenSessionIds,
  ]);

  return {
    hideSession,
    removeHiddenSession,
    showSession,
    visibleSessions,
  };
};
