import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
  readonly onManagedReviewAccept?: () => void;
  readonly onSpeakMessage?: (message: SessionMessage) => void;
  readonly providerLabel?: string | null;
  readonly providerTheme?: ProviderTheme | null;
  readonly speakingMessageId?: string | null;
}

interface ThinkingMessageProps {
  readonly className: string;
  readonly label: string;
  readonly message: SessionMessage;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
  readonly onSpeakMessage?: (message: SessionMessage) => void;
  readonly speakingMessageId?: string | null;
}

interface StandardMessageProps {
  readonly className: string;
  readonly label: string;
  readonly message: SessionMessage;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
  readonly onManagedReviewAccept?: () => void;
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
  onManagedReviewAccept,
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
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

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
            return (
              <ThinkingMessage
                className={className}
                key={message.id}
                label={label}
                message={message}
                onFileLinkActivate={onFileLinkActivate}
                onSpeakMessage={onSpeakMessage}
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
              onManagedReviewAccept={onManagedReviewAccept}
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
  onFileLinkActivate,
  onSpeakMessage,
  speakingMessageId,
  label,
  className,
}: ThinkingMessageProps) => (
  <article className={className}>
    <header className="session-dialog__message-header session-dialog__message-header--thinking">
      <span className="session-dialog__role">{label}</span>
      <SpeakMessageButton
        active={speakingMessageId === message.id}
        label={label}
        onClick={() => onSpeakMessage?.(message)}
      />
    </header>
    <MarkdownContent
      allowEmphasis={false}
      className="session-dialog__content session-dialog__content--thinking session-dialog__content--thinking-expanded"
      content={resolveDisplayContent(message)}
      id={`thinking-${message.id}`}
      onFileLinkActivate={onFileLinkActivate}
    />
  </article>
);

const StandardMessage = ({
  message,
  label,
  className,
  onManagedReviewAccept,
  onSpeakMessage,
  onFileLinkActivate,
  speakingMessageId,
}: StandardMessageProps) => {
  const { t } = useLocalization();
  const messageDate = new Date(message.createdAt);
  const showManagedReviewAccept =
    message.role === "system" &&
    message.tag === "managed-workflow-user-review" &&
    typeof onManagedReviewAccept === "function";
  const confirmLabel = t(
    "ui_interface",
    "session.dialog.managed_review_confirm_label",
    "Подтверждаю"
  );
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
      {showManagedReviewAccept ? (
        <footer className="session-dialog__review-actions">
          <button
            aria-label={confirmLabel}
            className="session-dialog__managed-review-confirm"
            onClick={onManagedReviewAccept}
            type="button"
          >
            {confirmLabel}
          </button>
        </footer>
      ) : null}
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
