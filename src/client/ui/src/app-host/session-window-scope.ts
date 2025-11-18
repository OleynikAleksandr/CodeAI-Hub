import { useCallback, useMemo } from "react";
import { getWindowContext } from "../environment";

export type SessionWindowScope = {
  readonly filteredSessionId: string | null;
  readonly shouldFilterSessions: boolean;
  readonly acceptsSession: (sessionId: string) => boolean;
};

export const useSessionWindowScope = (): SessionWindowScope => {
  const windowContext = useMemo(() => getWindowContext(), []);
  const filteredSessionId =
    windowContext.mode === "detached" && windowContext.sessionId
      ? windowContext.sessionId
      : null;
  const shouldFilterSessions = Boolean(
    windowContext.mode === "detached" && filteredSessionId
  );

  const acceptsSession = useCallback(
    (sessionId: string): boolean => {
      if (!(shouldFilterSessions && filteredSessionId)) {
        return true;
      }
      return sessionId === filteredSessionId;
    },
    [filteredSessionId, shouldFilterSessions]
  );

  return {
    filteredSessionId,
    shouldFilterSessions,
    acceptsSession,
  };
};
