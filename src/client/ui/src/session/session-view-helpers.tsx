import { useEffect, useRef, useState } from "react";
import type {
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
} from "../../../../types/session";
import { resolvePendingThinkingMessageId } from "./dialog-panel-pending-thinking";
import {
  buildVirtualConversationMessages,
  computeFallbackContinuationIndex,
  filterContinuityInternalMessages,
  resolveContinuationChain,
} from "./virtual-conversation";

type ConnectionState = SessionSnapshot["status"]["connectionState"];

export const useQueuedSend = (options: {
  readonly activeSessionId: string | null;
  readonly connectionState: ConnectionState;
  readonly onSendMessage: (sessionId: string, content: string) => void;
}): {
  readonly queuedMessage: string | null;
  readonly isQueued: boolean;
  readonly submitMessage: (text: string) => void;
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
    submitMessage: (text: string) => {
      if (!options.activeSessionId) {
        return;
      }
      if (options.connectionState === "blocked") {
        setQueuedMessage((previous) => previous ?? text);
        return;
      }
      if (options.connectionState === "idle") {
        options.onSendMessage(options.activeSessionId, text);
      }
    },
  };
};

type SessionMessageRole = "assistant" | "user" | "thinking";

export const resolveLastRelevantRole = (
  messages: readonly SessionMessage[]
): SessionMessageRole | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      message?.role !== "assistant" &&
      message?.role !== "user" &&
      message?.role !== "thinking"
    ) {
      continue;
    }
    return message.role;
  }
  return null;
};

export const resolveLastThinkingOrAssistantAt = (
  messages: readonly SessionMessage[]
): number | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "thinking" || message?.role === "assistant") {
      return message.createdAt;
    }
  }
  return null;
};

export const useAgentWorkingSilenceIndicator = (options: {
  readonly connectionState: ConnectionState;
  readonly isRolloverBlocked: boolean;
  readonly lastThinkingOrAssistantAt: number | null;
  readonly silenceMs: number;
}): boolean => {
  const [visible, setVisible] = useState(false);
  const previousConnectionStateRef = useRef<ConnectionState>(
    options.connectionState
  );
  const runningStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const previous = previousConnectionStateRef.current;
    if (options.connectionState === "running" && previous !== "running") {
      runningStartedAtRef.current = Date.now();
    }
    if (options.connectionState !== "running") {
      runningStartedAtRef.current = null;
    }
    previousConnectionStateRef.current = options.connectionState;
  }, [options.connectionState]);

  useEffect(() => {
    setVisible(false);
    if (options.connectionState !== "running" || options.isRolloverBlocked) {
      return;
    }

    const runningStartedAt = runningStartedAtRef.current ?? Date.now();
    const baseAt = Math.max(
      runningStartedAt,
      options.lastThinkingOrAssistantAt ?? 0
    );
    const elapsedMs = Date.now() - baseAt;
    const delayMs = Math.max(0, options.silenceMs - elapsedMs);
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    options.connectionState,
    options.isRolloverBlocked,
    options.lastThinkingOrAssistantAt,
    options.silenceMs,
  ]);

  return visible;
};

export const resolveContinuationIndex = (options: {
  readonly record: SessionRecord | null;
  readonly sessions: readonly SessionRecord[];
}): number | null => {
  if (!options.record) {
    return null;
  }
  if (typeof options.record.continuationIndex === "number") {
    return options.record.continuationIndex;
  }
  return computeFallbackContinuationIndex({
    record: options.record,
    sessions: options.sessions,
  });
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
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
}): readonly SessionMessage[] => {
  const base =
    options.activeSession &&
    options.activeSessionId &&
    options.continuationChain.length > 1
      ? buildVirtualConversationMessages({
          chain: options.continuationChain,
          snapshots: options.snapshots,
        })
      : (options.activeSession?.messages ?? []);
  const shouldSuppressRolloverThinking =
    options.activeSession?.status.connectionState === "blocked";
  const filtered =
    shouldSuppressRolloverThinking && base.length > 0
      ? base.filter((message) => message.role !== "thinking")
      : base;
  return filterContinuityInternalMessages(filtered);
};

export const computeShouldShowWorkingCopy = (options: {
  readonly connectionState: ConnectionState;
  readonly isRolloverBlocked: boolean;
  readonly showAgentWorkingIndicator: boolean;
  readonly virtualConversationMessages: readonly SessionMessage[];
}): boolean => {
  const lastRelevantRole = resolveLastRelevantRole(
    options.virtualConversationMessages
  );
  const hasPendingThinkingIndicator =
    resolvePendingThinkingMessageId(options.virtualConversationMessages) !==
    null;
  const isWorkingConnectionState =
    options.connectionState === "running" ||
    options.connectionState === "blocked";

  return (
    options.connectionState === "blocked" ||
    (isWorkingConnectionState &&
      (lastRelevantRole === "user" || hasPendingThinkingIndicator)) ||
    (options.showAgentWorkingIndicator &&
      !options.isRolloverBlocked &&
      options.connectionState === "running" &&
      lastRelevantRole === "assistant")
  );
};
