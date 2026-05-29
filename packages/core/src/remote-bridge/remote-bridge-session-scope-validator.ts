import type { SessionManager } from "../session-manager";
import type { IncomingMessage } from "./types";

const SESSION_SCOPED_MESSAGE_TYPES = new Set([
  "session:message",
  "session:claude:model-switch",
  "session:claude:thinking-switch",
  "session:codex:model-switch",
  "session:codex:reasoning-switch",
  "session:local-models:model-switch",
  "session:delete",
  "session:stop",
]);

export const validateSessionScopedMessageWorkspace = (options: {
  readonly clientId: string;
  readonly incoming: IncomingMessage;
  readonly sendScopeViolation: (
    clientId: string,
    command: string,
    message: string
  ) => void;
  readonly sessionManager: SessionManager;
  readonly workspacePath?: string | null;
}): boolean => {
  if (!SESSION_SCOPED_MESSAGE_TYPES.has(options.incoming.type)) {
    return true;
  }
  if (!options.workspacePath) {
    options.sendScopeViolation(
      options.clientId,
      options.incoming.type,
      "Workspace scope is not selected"
    );
    return false;
  }
  const sessionId = (
    options.incoming as { readonly payload?: { readonly sessionId?: string } }
  ).payload?.sessionId;
  const session = sessionId
    ? options.sessionManager.getSession(sessionId)
    : null;
  if (session && session.workspacePath !== options.workspacePath) {
    options.sendScopeViolation(
      options.clientId,
      options.incoming.type,
      "Session command rejected for out-of-scope workspace"
    );
    return false;
  }
  return true;
};
