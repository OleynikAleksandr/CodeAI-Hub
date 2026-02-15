import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SessionMessage } from "../../../../types/session";
import {
  buildMessageClassNames,
  extractSegmentBoundaryLabel,
  isSegmentBoundaryMessage,
  mergeThinkingMessages,
  resolveRoleLabel,
  shouldRenderImplicitBoundaryAfter,
} from "./dialog-panel-message-utils";
import type { ProviderTheme } from "./helpers";
import MarkdownContent from "./markdown-content";

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
    () => mergeThinkingMessages(messages),
    [messages]
  );
  const hasExplicitSegmentBoundaries = useMemo(
    () => displayMessages.some(isSegmentBoundaryMessage),
    [displayMessages]
  );
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

  const messageCount = displayMessages.length;

  useLayoutEffect(() => {
    if (!pinnedToBottom) {
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    if (messageCount === 0) {
      container.scrollTop = 0;
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messageCount, pinnedToBottom]);

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
        {displayMessages.map((message, index) => {
          if (isSegmentBoundaryMessage(message)) {
            return (
              <div
                className="session-dialog__segment-boundary"
                key={message.id}
              >
                <span className="session-dialog__segment-boundary-label">
                  {extractSegmentBoundaryLabel(message.content)}
                </span>
              </div>
            );
          }

          const next = displayMessages[index + 1] ?? null;
          const isTerminalThinking =
            message.role === "thinking" &&
            next &&
            (isSegmentBoundaryMessage(next) || next.role !== "assistant");

          const classNameBase = buildMessageClassNames(message, providerTheme);
          const className = isTerminalThinking
            ? `${classNameBase} session-dialog__message--thinking-terminal`
            : classNameBase;
          const label = resolveRoleLabel(message, providerLabel);
          if (message.role === "thinking") {
            const expanded = expandedThinking[message.id] ?? false;
            const shouldInsertImplicitBoundary =
              !hasExplicitSegmentBoundaries &&
              shouldRenderImplicitBoundaryAfter(message, next);
            return [
              <ThinkingMessage
                className={className}
                expanded={expanded}
                key={message.id}
                label={label}
                message={message}
                onToggle={toggleThinking}
              />,
              shouldInsertImplicitBoundary ? (
                <div
                  className="session-dialog__segment-boundary"
                  key={`${message.id}:implicit-boundary`}
                >
                  <span className="session-dialog__segment-boundary-label">
                    Новая сессия
                  </span>
                </div>
              ) : null,
            ].filter(Boolean);
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
      <MarkdownContent
        allowEmphasis={false}
        className="session-dialog__content session-dialog__content--thinking session-dialog__content--thinking-expanded"
        content={message.content}
        id={`thinking-${message.id}`}
      />
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
      <MarkdownContent
        className="session-dialog__content"
        content={message.content}
      />
    </article>
  );
};
