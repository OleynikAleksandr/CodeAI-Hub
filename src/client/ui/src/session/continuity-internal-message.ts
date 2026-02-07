import type { SessionMessage } from "../../../../types/session";

const CONTINUITY_INTERNAL_ACK = "Ready to continue working.";
const LEGACY_CONTINUITY_INTERNAL_ACK = "__CODEAIHUB_INTERNAL_CONTINUITY_ACK__";
const CONTINUITY_INTERNAL_MESSAGES = new Set<string>([
  CONTINUITY_INTERNAL_ACK,
  LEGACY_CONTINUITY_INTERNAL_ACK,
]);
const INLINE_MARKDOWN_CODE_PATTERN = /^`([^`]+)`$/;

const normalizeContinuityInternalContent = (content: string): string => {
  const trimmed = content.trim();
  return INLINE_MARKDOWN_CODE_PATTERN.exec(trimmed)?.[1]?.trim() ?? trimmed;
};

export const isContinuityInternalMessage = (message: SessionMessage): boolean =>
  message.role === "assistant" &&
  CONTINUITY_INTERNAL_MESSAGES.has(
    normalizeContinuityInternalContent(message.content)
  );
