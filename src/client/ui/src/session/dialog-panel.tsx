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
import {
  buildTranslatedTextRevealFrame,
  resolveTranslatedTextRevealBatchSize,
  resolveTranslatedTextRevealPrefixText,
  splitTranslatedTextRevealTokens,
} from "./translated-text-reveal";

const AUTO_SCROLL_EPSILON = 32;
const THINKING_TRANSLATION_FALLBACK_MS = 16_000;
const THINKING_TRANSLATION_REVEAL_INTERVAL_MS = 24;
const USER_MESSAGES_CATEGORY = "system_feedback";
const QUEUED_MANAGED_REVIEW_TAG = "managed-workflow-user-review-queued";

interface DialogPanelProps {
  readonly activeManagedReviewMessageId?: string | null;
  readonly managedReviewAcceptPending?: boolean;
  readonly messages: readonly SessionMessage[];
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
  readonly onManagedReviewAccept?: (message: SessionMessage) => void;
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
  readonly activeManagedReviewMessageId?: string | null;
  readonly className: string;
  readonly label: string;
  readonly managedReviewAcceptPending?: boolean;
  readonly message: SessionMessage;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
  readonly onManagedReviewAccept?: (message: SessionMessage) => void;
  readonly onSpeakMessage?: (message: SessionMessage) => void;
  readonly speakingMessageId?: string | null;
}

interface SpeakMessageButtonProps {
  readonly active: boolean;
  readonly label: string;
  readonly onClick?: () => void;
}

const DialogPanel = ({
  activeManagedReviewMessageId = null,
  managedReviewAcceptPending = false,
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
  const pinnedToBottomRef = useRef(true);

  const updatePinnedState = () => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    const nextPinned = distanceFromBottom <= AUTO_SCROLL_EPSILON;
    pinnedToBottomRef.current = nextPinned;
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

  // Re-pin to the bottom when a message bubble grows after its initial render
  // (e.g. a reasoning bubble's English text is replaced by a taller Russian
  // translation). The scrollAnchor effect above runs before that async growth,
  // so without this the bottom of the latest message gets pushed below the fold.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || displayMessages.length === 0) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (pinnedToBottomRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });
    for (const child of Array.from(container.children)) {
      observer.observe(child);
    }
    return () => {
      observer.disconnect();
    };
  }, [displayMessages]);

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
              activeManagedReviewMessageId={activeManagedReviewMessageId}
              className={className}
              key={message.id}
              label={label}
              managedReviewAcceptPending={managedReviewAcceptPending}
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

const isReasoningTranslationPending = (message: SessionMessage): boolean =>
  message.translationState === "pending" && !message.localizedContent;

const useTranslatedTextReveal = (content: string, enabled: boolean): string => {
  const [visibleText, setVisibleText] = useState(content);
  const initializedRef = useRef(false);
  const visibleTextRef = useRef(content);

  useEffect(() => {
    const commitVisibleText = (nextText: string) => {
      visibleTextRef.current = nextText;
      setVisibleText(nextText);
    };
    if (!(enabled && content)) {
      initializedRef.current = true;
      commitVisibleText(content);
      return;
    }
    if (!initializedRef.current) {
      initializedRef.current = true;
      commitVisibleText(content);
      return;
    }

    const tokens = splitTranslatedTextRevealTokens(content);
    const currentText = visibleTextRef.current;
    const initialText = resolveTranslatedTextRevealPrefixText(
      content,
      currentText
    );
    let visibleTokenCount = splitTranslatedTextRevealTokens(initialText).length;
    const batchSize = resolveTranslatedTextRevealBatchSize(tokens.length);
    commitVisibleText(
      buildTranslatedTextRevealFrame(tokens, visibleTokenCount)
    );
    if (visibleTokenCount >= tokens.length) {
      commitVisibleText(content);
      return;
    }

    const timer = window.setInterval(() => {
      visibleTokenCount = Math.min(
        tokens.length,
        visibleTokenCount + batchSize
      );
      const nextText = buildTranslatedTextRevealFrame(
        tokens,
        visibleTokenCount
      );
      commitVisibleText(nextText);
      if (visibleTokenCount >= tokens.length) {
        window.clearInterval(timer);
      }
    }, THINKING_TRANSLATION_REVEAL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [content, enabled]);

  return visibleText;
};

const ThinkingMessage = ({
  message,
  onFileLinkActivate,
  onSpeakMessage,
  speakingMessageId,
  label,
  className,
}: ThinkingMessageProps) => {
  const { t } = useLocalization();
  const translationPending = isReasoningTranslationPending(message);
  const [showSourceFallback, setShowSourceFallback] = useState(false);

  useEffect(() => {
    if (!translationPending) {
      setShowSourceFallback(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowSourceFallback(true);
    }, THINKING_TRANSLATION_FALLBACK_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [translationPending]);

  const displayContent = showSourceFallback
    ? message.content
    : resolveDisplayContent(message);
  const revealedContent = useTranslatedTextReveal(
    displayContent,
    Boolean(message.localizedContent && !showSourceFallback)
  );
  const pendingCopy = t(
    USER_MESSAGES_CATEGORY,
    "session.dialog.reasoning_translation_pending",
    "Перевод..."
  );
  const content =
    translationPending && !showSourceFallback ? pendingCopy : revealedContent;

  return (
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
        content={content}
        id={`thinking-${message.id}`}
        onFileLinkActivate={onFileLinkActivate}
      />
    </article>
  );
};

const StandardMessage = ({
  message,
  label,
  className,
  activeManagedReviewMessageId,
  managedReviewAcceptPending = false,
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
    message.id === activeManagedReviewMessageId &&
    typeof onManagedReviewAccept === "function";
  const showQueuedManagedReview =
    message.role === "system" && message.tag === QUEUED_MANAGED_REVIEW_TAG;
  const confirmLabel = t(
    "ui_interface",
    "session.dialog.managed_review_confirm_label",
    "Подтверждаю"
  );
  const queuedReviewCopy = t(
    "ui_interface",
    "session.dialog.managed_review_queued_copy",
    "Этот review ожидает очереди пользовательского подтверждения.\n\nСейчас активен другой шаг, требующий реакции пользователя. Кнопка «Подтверждаю» появится здесь автоматически, когда Core сделает этот review активным."
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
        content={
          showQueuedManagedReview
            ? queuedReviewCopy
            : resolveDisplayContent(message)
        }
        onFileLinkActivate={onFileLinkActivate}
      />
      {showManagedReviewAccept ? (
        <footer className="session-dialog__review-actions">
          <button
            aria-label={confirmLabel}
            className="session-dialog__managed-review-confirm"
            disabled={managedReviewAcceptPending}
            onClick={() => onManagedReviewAccept?.(message)}
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
