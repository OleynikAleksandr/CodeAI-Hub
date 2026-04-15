import { useEffect, useState } from "react";
import type {
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
} from "../../../../types/session";
import { shouldHideThinkingMessage } from "./helpers";
import {
  buildVirtualConversationMessages,
  filterContinuityInternalMessages,
  resolveContinuationChain,
} from "./virtual-conversation";

type ConnectionState = SessionSnapshot["status"]["connectionState"];

const applyThinkingVisibilityFilter = (
  messages: readonly SessionMessage[],
  currentShowThinking: boolean
): readonly SessionMessage[] =>
  messages.filter(
    (message) => !shouldHideThinkingMessage({ message, currentShowThinking })
  );

export const useQueuedSend = (options: {
  readonly activeSessionId: string | null;
  readonly connectionState: ConnectionState;
  readonly onSendMessage: (sessionId: string, content: string) => void;
}): {
  readonly queuedMessage: string | null;
  readonly isQueued: boolean;
  readonly submitMessage: (text: string) => void;
  readonly clearQueuedMessage: () => void;
} => {
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (
      !(
        queuedMessage &&
        options.connectionState === "idle" &&
        options.activeSessionId
      )
    ) {
      return;
    }
    const message = queuedMessage;
    setQueuedMessage(null);
    options.onSendMessage(options.activeSessionId, message);
  }, [
    options.activeSessionId,
    options.connectionState,
    options.onSendMessage,
    queuedMessage,
  ]);

  return {
    queuedMessage,
    isQueued: queuedMessage !== null,
    clearQueuedMessage: () => setQueuedMessage(null),
    submitMessage: (text: string) => {
      if (!options.activeSessionId) {
        return;
      }
      if (options.connectionState !== "idle") {
        setQueuedMessage((previous) => previous ?? text);
        return;
      }
      options.onSendMessage(options.activeSessionId, text);
    },
  };
};

export const resolveContinuationChainOrEmpty = (options: {
  readonly sessions: readonly SessionRecord[];
  readonly activeSessionId: string | null;
}): readonly SessionRecord[] => {
  if (!options.activeSessionId) {
    return [];
  }
  return resolveContinuationChain({
    sessions: options.sessions,
    activeSessionId: options.activeSessionId,
  });
};

export const resolveVirtualConversationMessages = (options: {
  readonly activeSessionId: string | null;
  readonly activeSession: SessionSnapshot | null;
  readonly continuationChain: readonly SessionRecord[];
  readonly showThinkingMessages?: boolean;
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
}): readonly SessionMessage[] => {
  const currentShowThinking = options.showThinkingMessages !== false;
  const base =
    options.activeSession &&
    options.activeSessionId &&
    options.continuationChain.length > 1
      ? buildVirtualConversationMessages({
          chain: options.continuationChain,
          snapshots: options.snapshots,
          showThinkingMessages: currentShowThinking,
        })
      : (options.activeSession?.messages ?? []);
  const filtered = applyThinkingVisibilityFilter(base, currentShowThinking);
  return filterContinuityInternalMessages(filtered);
};
