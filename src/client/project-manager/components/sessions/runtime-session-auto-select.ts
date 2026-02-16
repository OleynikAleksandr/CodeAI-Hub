import type { SessionMessage, SessionRecord } from "../../../../types/session";
import { sanitizeMessage } from "../../../ui/src/core-bridge/normalizers";

const resolveMostRecentSessionId = (
  sessions: readonly SessionRecord[]
): string | null => {
  if (sessions.length === 0) {
    return null;
  }
  return sessions.reduce((latest, session) =>
    session.createdAt > latest.createdAt ? session : latest
  ).id;
};

export const resolveMostRecentVisibleSessionId = (
  visibleSessions: readonly SessionRecord[]
): string | null => {
  const reviewerSessions = visibleSessions.filter(
    (session) => session.sessionKind === "reviewer"
  );
  if (reviewerSessions.length > 0) {
    return resolveMostRecentSessionId(reviewerSessions);
  }
  return resolveMostRecentSessionId(visibleSessions);
};

export const resolveMostRecentWorkspaceSessionId = (params: {
  readonly sessions: readonly SessionRecord[];
  readonly workspacePath?: string;
}): string | null => {
  if (!params.workspacePath) {
    return null;
  }
  const inScope = params.sessions.filter(
    (session) => session.workspacePath === params.workspacePath
  );
  return resolveMostRecentVisibleSessionId(inScope);
};

export const normalizeSessionHistoryMessages = (
  messages: readonly unknown[]
): SessionMessage[] => {
  const normalized: SessionMessage[] = [];
  for (const message of messages) {
    const converted = sanitizeMessage(message as never);
    if (converted) {
      normalized.push(converted);
    }
  }
  return normalized;
};

