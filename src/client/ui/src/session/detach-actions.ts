import { postVsCodeMessage } from "../vscode";

const SESSION_DETACH_MESSAGE = "session:detach";

const isValidSessionId = (
  sessionId: string | null | undefined
): sessionId is string => typeof sessionId === "string" && sessionId.length > 0;

export const requestSessionDetach = (sessionId: string): void => {
  if (!isValidSessionId(sessionId)) {
    return;
  }

  postVsCodeMessage({
    type: SESSION_DETACH_MESSAGE,
    payload: { sessionId },
  });
};
