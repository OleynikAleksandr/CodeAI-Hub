import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SessionMessage } from "../../../../types/session";
import { useLocalization } from "../app-host/use-localization";
import {
  buildMessageClassNames,
  extractSegmentBoundaryLabel,
  isSegmentBoundaryMessage,
  mergeLiveAssistantMessages,
  mergeThinkingMessages,
  resolveDisplayContent,
  resolveRoleLabel,
} from "./dialog-panel-message-utils";
import { buildDialogPanelScrollAnchor } from "./dialog-panel-scroll-anchor";
import type { FileLinkTarget } from "./file-link-target";
import type { ProviderTheme } from "./helpers";
import MarkdownContent from "./markdown-content";

const AUTO_SCROLL_EPSILON = 32;
const USER_MESSAGES_CATEGORY = "system_feedback";

interface DialogPanelProps {
  readonly messages: readonly SessionMessage[];
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
  readonly onSpeakMessage?: (message: SessionMessage) => void;
  readonly providerLabel?: string | null;
  readonly providerTheme?: ProviderTheme | null;
  readonly speakingMessageId?: string | null;
}

interface ThinkingMessageProps {
  readonly className: string;
  readonly expanded: boolean;
  readonly label: string;
  readonly message: SessionMessage;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
  readonly onSpeakMessage?: (message: SessionMessage) => void;
  readonly onToggle: (messageId: string) => void;
  readonly speakingMessageId?: string | null;
}

interface StandardMessageProps {
  readonly className: string;
  readonly label: string;
  readonly message: SessionMessage;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
  readonly onSpeakMessage?: (message: SessionMessage) => void;
  readonly speakingMessageId?: string | null;
}

interface SpeakMessageButtonProps {
  readonly active: boolean;
  readonly label: string;
  readonly onClick?: () => void;
}

const DialogPanel = ({
  messages,
  onSpeakMessage,
  onFileLinkActivate,
  providerTheme = null,
  providerLabel = null,
  speakingMessageId = null,
}: DialogPanelProps) => {
  const { t } = useLocalization();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const displayMessages = useMemo(
    () => mergeLiveAssistantMessages(mergeThinkingMessages(messages)),
    [messages]
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

  const scrollAnchor = useMemo(
    () => buildDialogPanelScrollAnchor(displayMessages),
    [displayMessages]
  );

  useLayoutEffect(() => {
    if (!pinnedToBottom) {
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    if (scrollAnchor === "empty") {
      container.scrollTop = 0;
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [pinnedToBottom, scrollAnchor]);

  if (displayMessages.length === 0) {
    return (
      <div className="session-dialog session-panel">
        <p className="session-dialog__empty">
          {t(
            USER_MESSAGES_CATEGORY,
            "session.dialog.empty_label",
            "No messages yet."
          )}
        </p>
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
            return (
              <ThinkingMessage
                className={className}
                expanded={expanded}
                key={message.id}
                label={label}
                message={message}
                onFileLinkActivate={onFileLinkActivate}
                onSpeakMessage={onSpeakMessage}
                onToggle={toggleThinking}
                speakingMessageId={speakingMessageId}
              />
            );
          }

          return (
            <StandardMessage
              className={className}
              key={message.id}
              label={label}
              message={message}
              onFileLinkActivate={onFileLinkActivate}
              onSpeakMessage={onSpeakMessage}
              speakingMessageId={speakingMessageId}
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
  onFileLinkActivate,
  onSpeakMessage,
  speakingMessageId,
  label,
  className,
}: ThinkingMessageProps) => {
  const { t } = useLocalization();
  const hideReasoningLabel = t(
    "ui_interface",
    "session.dialog.hide_reasoning_label",
    "Hide reasoning"
  );
  const showReasoningLabel = t(
    "ui_interface",
    "session.dialog.show_reasoning_label",
    "Show reasoning"
  );

  return (
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
          title={expanded ? hideReasoningLabel : showReasoningLabel}
          type="button"
        >
          {expanded ? "▾" : "▸"}
        </button>
        <span className="session-dialog__role">{label}</span>
        <SpeakMessageButton
          active={speakingMessageId === message.id}
          label={label}
          onClick={() => onSpeakMessage?.(message)}
        />
      </header>
      {expanded ? (
        <MarkdownContent
          allowEmphasis={false}
          className="session-dialog__content session-dialog__content--thinking session-dialog__content--thinking-expanded"
          content={resolveDisplayContent(message)}
          id={`thinking-${message.id}`}
          onFileLinkActivate={onFileLinkActivate}
        />
      ) : null}
    </article>
  );
};

const StandardMessage = ({
  message,
  label,
  className,
  onSpeakMessage,
  onFileLinkActivate,
  speakingMessageId,
}: StandardMessageProps) => {
  const messageDate = new Date(message.createdAt);
  return (
    <article className={className}>
      <header className="session-dialog__message-header">
        <span className="session-dialog__role">{label}</span>
        <SpeakMessageButton
          active={speakingMessageId === message.id}
          label={label}
          onClick={() => onSpeakMessage?.(message)}
        />
        <time
          className="session-dialog__timestamp"
          dateTime={messageDate.toISOString()}
        >
          {messageDate.toLocaleTimeString()}
        </time>
      </header>
      <MarkdownContent
        className="session-dialog__content"
        content={resolveDisplayContent(message)}
        onFileLinkActivate={onFileLinkActivate}
      />
    </article>
  );
};

const SpeakMessageButton = ({
  active,
  label,
  onClick,
}: SpeakMessageButtonProps) => {
  const { t } = useLocalization();
  const speakLabel = t(
    "ui_interface",
    "session.dialog.speak_message_label",
    "Speak"
  );
  return (
    <button
      aria-label={`${speakLabel}: ${label}`}
      aria-pressed={active}
      className={
        active
          ? "session-dialog__speak-button session-dialog__speak-button--active"
          : "session-dialog__speak-button"
      }
      onClick={onClick}
      title={speakLabel}
      type="button"
    >
      {speakLabel}
    </button>
  );
};
