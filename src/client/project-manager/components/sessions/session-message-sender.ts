import { useCallback, type MutableRefObject } from "react";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";

export const useSessionMessageSender = (
  sessionsRef: MutableRefObject<readonly SessionRecord[]>,
  workspacePath?: string
) =>
  useCallback(
    (sessionId: string, content: string) => {
      const record = sessionsRef.current.find(
        (session) => session.id === sessionId
      );
      if (
        !record ||
        !workspacePath ||
        record.workspacePath !== workspacePath
      ) {
        return;
      }
      api.sendSessionMessage(sessionId, content);
    },
    [sessionsRef, workspacePath]
  );
