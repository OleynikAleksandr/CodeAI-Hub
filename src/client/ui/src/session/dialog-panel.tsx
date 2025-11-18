import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SessionMessage } from "../../../../types/session";

type ProviderTheme = "claude" | "codex" | "gemini";

const AUTO_SCROLL_EPSILON = 32;

type DialogPanelProps = {
  readonly messages: readonly SessionMessage[];
  readonly providerTheme?: ProviderTheme | null;
  readonly providerLabel?: string | null;
};

type ThinkingMessageProps = {
  readonly message: SessionMessage;
  readonly expanded: boolean;
  readonly onToggle: (messageId: string) => void;
  readonly label: string;
  readonly className: string;
};

type StandardMessageProps = {
  readonly message: SessionMessage;
  readonly label: string;
  readonly className: string;
};

const DialogPanel = ({
  messages,
  providerTheme = null,
  providerLabel = null,
}: DialogPanelProps) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const displayMessages = useMemo(
    () => mergeThinkingSegments(messages),
    [messages]
  );
  const lastMessageKey =
    displayMessages.length > 0 ? (displayMessages.at(-1)?.id ?? null) : null;
  const [expandedThinking, setExpandedThinking] = useState<
    Record<string, boolean>
  >({});
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  useEffect(() => {
    setExpandedThinking((previous) => {
      let hasChanges = false;
      const nextState = { ...previous };
      for (const message of displayMessages) {
        if (
          message.role === "thinking" &&
          nextState[message.id] === undefined
        ) {
          nextState[message.id] = false;
          hasChanges = true;
        }
      }
      return hasChanges ? nextState : previous;
    });
  }, [displayMessages]);

  const toggleThinking = (messageId: string) => {
    setExpandedThinking((previous) => ({
      ...previous,
      [messageId]: !previous[messageId],
    }));
  };

  const updatePinnedState = () => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    const nextPinned = distanceFromBottom <= AUTO_SCROLL_EPSILON;
    setPinnedToBottom((current) =>
      current === nextPinned ? current : nextPinned
    );
  };

  useLayoutEffect(() => {
    if (!pinnedToBottom) {
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    if (lastMessageKey === null) {
      container.scrollTop = container.scrollHeight;
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [lastMessageKey, pinnedToBottom]);

  if (displayMessages.length === 0) {
    return (
      <div className="session-dialog session-panel">
        <p className="session-dialog__empty">No messages yet.</p>
      </div>
    );
  }

  return (
    <div className="session-dialog session-panel">
      <div
        className="session-dialog__scroll"
        onScroll={updatePinnedState}
        ref={scrollContainerRef}
      >
        {displayMessages.map((message) => {
          const className = buildMessageClassNames(message, providerTheme);
          const label = resolveRoleLabel(message, providerLabel);
          if (message.role === "thinking") {
            const expanded = expandedThinking[message.id] ?? false;
            return (
              <ThinkingMessage
                className={className}
                expanded={expanded}
                key={message.id}
                label={label}
                message={message}
                onToggle={toggleThinking}
              />
            );
          }

          return (
            <StandardMessage
              className={className}
              key={message.id}
              label={label}
              message={message}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DialogPanel;

const buildMessageClassNames = (
  message: SessionMessage,
  providerTheme: ProviderTheme | null
): string => {
  const classes = [
    "session-dialog__message",
    `session-dialog__message--${message.role}`,
  ];
  if (message.role === "assistant" && providerTheme) {
    classes.push(`session-dialog__message--assistant-${providerTheme}`);
  }
  return classes.join(" ");
};

const resolveRoleLabel = (
  message: SessionMessage,
  providerLabel: string | null
): string => {
  if (message.role === "assistant") {
    return providerLabel ?? "Assistant";
  }
  if (message.role === "user") {
    return "User";
  }
  if (message.role === "thinking") {
    return "Thinking";
  }
  return "System";
};

const ThinkingMessage = ({
  message,
  expanded,
  onToggle,
  label,
  className,
}: ThinkingMessageProps) => (
  <article className={className}>
    <header className="session-dialog__message-header session-dialog__message-header--thinking">
      <button
        aria-controls={`thinking-${message.id}`}
        aria-expanded={expanded}
        className={
          expanded
            ? "session-dialog__thinking-toggle session-dialog__thinking-toggle--expanded"
            : "session-dialog__thinking-toggle"
        }
        onClick={() => onToggle(message.id)}
        title={expanded ? "Hide reasoning" : "Show reasoning"}
        type="button"
      >
        {expanded ? "▾" : "▸"}
      </button>
      <span className="session-dialog__role">{label}</span>
    </header>
    {expanded ? (
      <p
        className="session-dialog__content session-dialog__content--thinking"
        id={`thinking-${message.id}`}
      >
        {message.content}
      </p>
    ) : null}
  </article>
);

const StandardMessage = ({
  message,
  label,
  className,
}: StandardMessageProps) => {
  const messageDate = new Date(message.createdAt);
  return (
    <article className={className}>
      <header className="session-dialog__message-header">
        <span className="session-dialog__role">{label}</span>
        <time
          className="session-dialog__timestamp"
          dateTime={messageDate.toISOString()}
        >
          {messageDate.toLocaleTimeString()}
        </time>
      </header>
      <p className="session-dialog__content">{message.content}</p>
    </article>
  );
};

const mergeThinkingSegments = (
  messages: readonly SessionMessage[]
): SessionMessage[] => {
  const merged: SessionMessage[] = [];
  let pending: SessionMessage | null = null;

  for (const message of messages) {
    if (message.role === "thinking") {
      if (pending) {
        const combinedThinking: SessionMessage = {
          ...pending,
          content: `${pending.content}\n\n${message.content}`,
          createdAt: message.createdAt,
        };
        pending = combinedThinking;
      } else {
        pending = { ...message };
      }
      continue;
    }
    if (pending) {
      merged.push(pending);
      pending = null;
    }
    merged.push(message);
  }

  if (pending) {
    merged.push(pending);
  }

  return merged;
};
