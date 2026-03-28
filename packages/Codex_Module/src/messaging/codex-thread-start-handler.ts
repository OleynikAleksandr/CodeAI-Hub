import type { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { ModuleReporter } from "../types";
import {
  PROVIDER,
  THREAD_ID_SHORT_LENGTH,
} from "./codex-message-processor-shared";
import type { CodexReasoningStreams } from "./codex-reasoning-streams";
import type { CodexSessionEventEmitter } from "./codex-session-event-emitter";
import type { StructuredOutputStreamController } from "./structured-output-stream-controller";

export const handleCodexThreadStarted = (params: {
  readonly session: ActiveSession;
  readonly threadId: string;
  readonly sessionManager: CodexSessionManager;
  readonly structuredOutput: StructuredOutputStreamController;
  readonly reasoningStreams: CodexReasoningStreams;
  readonly emitter: CodexSessionEventEmitter;
  readonly reporter?: ModuleReporter;
}): void => {
  const {
    emitter,
    reasoningStreams,
    reporter,
    session,
    sessionManager,
    structuredOutput,
    threadId,
  } = params;
  const existingThreadId = session.codexThreadId;
  if (existingThreadId && existingThreadId !== threadId) {
    reporter?.warn?.(
      `Ignoring unexpected Codex thread_id change (${existingThreadId} -> ${threadId})`
    );
    session.logger?.logSDKEvent("thread_id_ignored", {
      expected: existingThreadId,
      received: threadId,
    });
    return;
  }

  const previousId = session.sessionId;
  session.codexThreadId = threadId;
  session.logger?.logSDKEvent("thread_id", threadId);

  if (!existingThreadId && previousId !== threadId) {
    structuredOutput.promoteSession(previousId, threadId);
    sessionManager.updateSessionId(previousId, threadId);
    session.logger?.renameSession?.(previousId, threadId);
    reasoningStreams.clear(previousId);
    session.eventEmitter.emit("sessionIdChanged", {
      oldId: previousId,
      newId: threadId,
      provider: PROVIDER,
      shortId: threadId.slice(0, THREAD_ID_SHORT_LENGTH),
    });
  }

  emitter.emitMessage(session, {
    type: "thread_started",
    provider: PROVIDER,
    sessionId: session.sessionId,
    threadId,
    timestamp: new Date().toISOString(),
  });
};
