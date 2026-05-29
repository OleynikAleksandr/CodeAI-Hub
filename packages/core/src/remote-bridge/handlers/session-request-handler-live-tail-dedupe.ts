import type { SessionMessage, SessionRole } from "../../session-manager";

const MIN_OVERLAP_CHARS = 32;
const MAX_OVERLAP_SCAN_CHARS = 12_000;
const ORPHAN_TAIL_MAX_CHARS = 24;
const LEADING_WHITESPACE_REGEX = /^\s/u;
const WORD_OR_FILENAME_TAIL_REGEX = /^[\p{L}\p{N}_-]/u;

export interface LiveTailDedupeOptions {
  readonly content: string;
  readonly messages: readonly Pick<
    SessionMessage,
    "content" | "role" | "tag"
  >[];
  readonly role: SessionRole;
  readonly tag?: string;
}

export interface LiveTailDedupeResult {
  readonly content: string;
  readonly tag?: string;
}

export const resolveLiveAssistantTailDedupe = (
  options: LiveTailDedupeOptions
): LiveTailDedupeResult | null => {
  if (options.role !== "assistant" || options.tag === "live") {
    return { content: options.content, tag: options.tag };
  }
  const liveText = collectTrailingLiveAssistantText(options.messages);
  if (liveText.length === 0) {
    return { content: options.content, tag: options.tag };
  }
  const resolved = resolveCoveredOrOverlappingTail(liveText, options.content);
  if (resolved === undefined) {
    return { content: options.content, tag: options.tag };
  }
  if (resolved === null) {
    return null;
  }
  return { content: resolved, tag: "live" };
};

const collectTrailingLiveAssistantText = (
  messages: readonly Pick<SessionMessage, "content" | "role" | "tag">[]
): string => {
  const chunks: string[] = [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant" && message.tag === "live") {
      chunks.push(message.content);
      continue;
    }
    break;
  }
  return chunks.reverse().join("");
};

const resolveCoveredOrOverlappingTail = (
  liveText: string,
  finalText: string
): string | null | undefined => {
  if (finalText.trim().length === 0) {
    return null;
  }
  if (finalText.startsWith(liveText)) {
    return normalizeUnseenTail(finalText.slice(liveText.length));
  }
  if (
    finalText.trim().length >= MIN_OVERLAP_CHARS &&
    liveText.includes(finalText)
  ) {
    return null;
  }
  const overlapLength = longestSuffixPrefixOverlap(liveText, finalText);
  if (overlapLength < MIN_OVERLAP_CHARS) {
    return undefined;
  }
  return normalizeUnseenTail(finalText.slice(overlapLength));
};

const normalizeUnseenTail = (tail: string): string | null => {
  if (tail.trim().length === 0 || isLikelyOrphanTail(tail)) {
    return null;
  }
  return tail;
};

const longestSuffixPrefixOverlap = (left: string, right: string): number => {
  const leftWindow = left.slice(-MAX_OVERLAP_SCAN_CHARS);
  const rightWindow = right.slice(0, MAX_OVERLAP_SCAN_CHARS);
  const maxLength = Math.min(leftWindow.length, rightWindow.length);
  for (let length = maxLength; length >= MIN_OVERLAP_CHARS; length -= 1) {
    if (leftWindow.endsWith(rightWindow.slice(0, length))) {
      return length;
    }
  }
  return 0;
};

const isLikelyOrphanTail = (tail: string): boolean => {
  const trimmed = tail.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= ORPHAN_TAIL_MAX_CHARS &&
    !LEADING_WHITESPACE_REGEX.test(tail) &&
    WORD_OR_FILENAME_TAIL_REGEX.test(trimmed)
  );
};
