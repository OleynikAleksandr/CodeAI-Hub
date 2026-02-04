import { useEffect, useState } from "react";
import type { SessionSnapshot } from "../../../../types/session";
import { AnimatedDots } from "./animated-dots";
import type { mapProviderTheme } from "./helpers";

type ConnectionState = SessionSnapshot["status"]["connectionState"];
type ProviderTheme = ReturnType<typeof mapProviderTheme>;

export const resolveVisibleBanner = (options: {
  readonly banner: JSX.Element | null;
  readonly queuedMessage: string | null;
}): JSX.Element | null => (options.queuedMessage ? null : options.banner);

export const buildAgentWorkingBanner = (options: {
  readonly queuedMessage: string | null;
  readonly showAgentWorkingIndicator: boolean;
  readonly isRolloverBlocked: boolean;
  readonly providerTheme: ProviderTheme;
  readonly isWaitingForAssistant: boolean;
}): JSX.Element | null => {
  if (
    options.queuedMessage ||
    (options.showAgentWorkingIndicator &&
      options.isWaitingForAssistant &&
      !options.isRolloverBlocked)
  ) {
    return (
      <output aria-live="polite" className="session-panel">
        <span>Agent is working</span>
        <AnimatedDots theme={options.providerTheme} />
      </output>
    );
  }
  return null;
};

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
