import type { SessionMessage } from "../../../../types/session";
import type { ProviderTheme } from "./helpers";

const SEGMENT_BOUNDARY_MARKER = "__CODEAIHUB_SEGMENT_BOUNDARY__";
const TRAILING_MARKDOWN_LIST_MARKER_REGEX =
  /(?:^|\n)\s{0,3}(?:\d+\.|[-*+])\s*$/u;
const LEADING_MARKDOWN_LIST_MARKER_REGEX = /^(?:\d+\.|[-*+])(?:\s|$)/u;
const LEADING_STANDALONE_BOLD_HEADING_BLOCK_REGEX =
  /^\s*\*\*[^\n]*\*\*\s*(?:\r?\n){2,}\S/u;
const DISPLAY_DUPLICATE_WHITESPACE_REGEX = /\s+/gu;

const isAssistantThinkingMessage = (message: SessionMessage): boolean =>
  message.role === "assistant" && message.tag === "thinking";

export const isSegmentBoundaryMessage = (message: SessionMessage): boolean =>
  message.role === "system" &&
  (message.id.startsWith("segment-boundary:") ||
    message.content.trimStart().startsWith(SEGMENT_BOUNDARY_MARKER));

export const extractSegmentBoundaryLabel = (content: string): string => {
  const lines = content.split("\n").map((line) => line.trim());
  if (lines.length === 0) {
    return "";
  }
  if (lines[0] !== SEGMENT_BOUNDARY_MARKER) {
    return content;
  }
  return lines[1] ?? "Новая сессия";
};

export const buildMessageClassNames = (
  message: SessionMessage,
  providerTheme: ProviderTheme | null
): string => {
  const classes = [
    "session-dialog__message",
    `session-dialog__message--${message.role}`,
  ];
  if (isAssistantThinkingMessage(message)) {
    classes.push("session-dialog__message--assistant-thinking");
  }
  if (message.role === "assistant" && providerTheme) {
    classes.push(`session-dialog__message--assistant-${providerTheme}`);
  }
  return classes.join(" ");
};

export const resolveDisplayContent = (message: SessionMessage): string =>
  message.localizedContent ?? message.content;

export const resolveRoleLabel = (
  message: SessionMessage,
  providerLabel: string | null
): string => {
  if (message.role === "assistant") {
    if (message.tag === "thinking") {
      return providerLabel ? `${providerLabel} · Thinking` : "Thinking";
    }
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

const isThinkingDisplayMessage = (message: SessionMessage): boolean =>
  message.role === "thinking" || isAssistantThinkingMessage(message);

const shouldRepairSplitListMarker = (
  previousContent: string,
  nextContent: string
): boolean => {
  const normalizedPrevious = previousContent.trimEnd();
  if (!TRAILING_MARKDOWN_LIST_MARKER_REGEX.test(normalizedPrevious)) {
    return false;
  }
  const normalizedNext = nextContent.trimStart();
  if (normalizedNext.length === 0) {
    return false;
  }
  return !LEADING_MARKDOWN_LIST_MARKER_REGEX.test(normalizedNext);
};

const startsWithStandaloneBoldHeadingBlock = (content: string): boolean =>
  LEADING_STANDALONE_BOLD_HEADING_BLOCK_REGEX.test(content.trimStart());

const joinThinkingDisplayContent = (
  previousContent: string,
  nextContent: string
): string => {
  if (shouldRepairSplitListMarker(previousContent, nextContent)) {
    return `${previousContent.trimEnd()} ${nextContent.trimStart()}`;
  }
  if (startsWithStandaloneBoldHeadingBlock(nextContent)) {
    return `${previousContent.trimEnd()}\n\n${nextContent.trimStart()}`;
  }
  return `${previousContent}\n${nextContent}`;
};

const mergeThinkingDisplayMessage = (
  previous: SessionMessage,
  next: SessionMessage
): SessionMessage => {
  const useAssistantThinking =
    isAssistantThinkingMessage(previous) || isAssistantThinkingMessage(next);
  const content = joinThinkingDisplayContent(previous.content, next.content);
  const localizedContent = joinThinkingDisplayContent(
    resolveDisplayContent(previous),
    resolveDisplayContent(next)
  );
  return {
    ...previous,
    content,
    ...(localizedContent === content ? {} : { localizedContent }),
    ...(useAssistantThinking ? { role: "assistant", tag: "thinking" } : {}),
  };
};

export const mergeThinkingMessages = (
  source: readonly SessionMessage[]
): SessionMessage[] => {
  const result: SessionMessage[] = [];
  for (const message of source) {
    if (isThinkingDisplayMessage(message)) {
      const previous = result.at(-1);
      if (previous && isThinkingDisplayMessage(previous)) {
        result[result.length - 1] = mergeThinkingDisplayMessage(
          previous,
          message
        );
        continue;
      }
      result.push({ ...message });
      continue;
    }
    result.push(message);
  }
  return result;
};

const isLiveAssistantMessage = (message: SessionMessage): boolean =>
  message.role === "assistant" && message.tag === "live";

const normalizeDisplayDuplicateContent = (content: string): string =>
  content.replace(DISPLAY_DUPLICATE_WHITESPACE_REGEX, " ").trim();

const hasSubstantiveDisplayContent = (message: SessionMessage): boolean =>
  normalizeDisplayDuplicateContent(resolveDisplayContent(message)).length > 0;

const hasRecentLiveAssistantDisplayMessage = (
  messages: readonly SessionMessage[]
): boolean => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    if (!candidate) {
      continue;
    }
    if (isLiveAssistantMessage(candidate)) {
      return hasSubstantiveDisplayContent(candidate);
    }
    if (candidate.role === "system" || candidate.role === "user") {
      return false;
    }
  }
  return false;
};

const isStreamedFinalAssistantSnapshot = (
  messages: readonly SessionMessage[],
  message: SessionMessage
): boolean =>
  Boolean(
    message.role === "assistant" &&
      !message.tag &&
      hasRecentLiveAssistantDisplayMessage(messages)
  );

/**
 * Live assistant text deltas arrive as multiple append-only bubbles so the
 * Core translation overlay can attach localizedContent per segment. Visually
 * the user expects a single growing card, not one card per sentence. This
 * merge pass is symmetric to mergeThinkingMessages but uses direct
 * concatenation (no newline-join) because ClaudeTextLiveBuffer emits
 * boundary-aligned segments whose trailing punctuation/whitespace already
 * forms natural reading breaks.
 */
const mergeLiveAssistantDisplayMessage = (
  previous: SessionMessage,
  next: SessionMessage
): SessionMessage => {
  const content = `${previous.content}${next.content}`;
  const localizedContent = `${resolveDisplayContent(previous)}${resolveDisplayContent(next)}`;
  return {
    ...previous,
    content,
    ...(localizedContent === content ? {} : { localizedContent }),
  };
};

export const mergeLiveAssistantMessages = (
  source: readonly SessionMessage[]
): SessionMessage[] => {
  const result: SessionMessage[] = [];
  for (const message of source) {
    if (isLiveAssistantMessage(message)) {
      const previous = result.at(-1);
      if (previous && isLiveAssistantMessage(previous)) {
        result[result.length - 1] = mergeLiveAssistantDisplayMessage(
          previous,
          message
        );
        continue;
      }
      if (!hasSubstantiveDisplayContent(message)) {
        continue;
      }
      result.push({ ...message });
      continue;
    }
    if (isStreamedFinalAssistantSnapshot(result, message)) {
      continue;
    }
    if (isThinkingDisplayMessage(message)) {
      const previous = result.at(-1);
      if (previous && isThinkingDisplayMessage(previous)) {
        result[result.length - 1] = mergeThinkingDisplayMessage(
          previous,
          message
        );
        continue;
      }
    }
    result.push(message);
  }
  return result;
};
