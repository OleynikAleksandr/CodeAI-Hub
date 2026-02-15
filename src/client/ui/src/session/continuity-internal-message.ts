import type { SessionMessage } from "../../../../types/session";

const CONTINUITY_INTERNAL_ACK = "Ready to continue working.";
const LEGACY_CONTINUITY_INTERNAL_ACK = "__CODEAIHUB_INTERNAL_CONTINUITY_ACK__";
const CONTINUITY_INTERNAL_MESSAGES = new Set<string>([
  CONTINUITY_INTERNAL_ACK,
  LEGACY_CONTINUITY_INTERNAL_ACK,
]);
const INLINE_MARKDOWN_CODE_PATTERN = /^`([^`]+)`$/;
const JSON_CODE_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)\s*```/gi;

const normalizeContinuityInternalContent = (content: string): string => {
  const trimmed = content.trim();
  return INLINE_MARKDOWN_CODE_PATTERN.exec(trimmed)?.[1]?.trim() ?? trimmed;
};

const tryParseContinuityInternalAck = (content: string): string | null => {
  const normalized = normalizeContinuityInternalContent(content);
  if (CONTINUITY_INTERNAL_MESSAGES.has(normalized)) {
    return normalized;
  }

  const trimmed = content.trim();
  if (trimmed.includes(LEGACY_CONTINUITY_INTERNAL_ACK)) {
    return LEGACY_CONTINUITY_INTERNAL_ACK;
  }

  const tryParseJson = (candidate: string): string | null => {
    const json = candidate.trim();
    if (!(json.startsWith("{") && json.endsWith("}"))) {
      return null;
    }
    try {
      const parsed = JSON.parse(json) as unknown;
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      const record = parsed as { readonly answer?: unknown };
      if (typeof record.answer !== "string") {
        return null;
      }
      const answer = record.answer.trim();
      return CONTINUITY_INTERNAL_MESSAGES.has(answer) ? answer : null;
    } catch {
      return null;
    }
  };

  const directJsonAck = tryParseJson(trimmed);
  if (directJsonAck) {
    return directJsonAck;
  }

  for (const match of trimmed.matchAll(JSON_CODE_FENCE_PATTERN)) {
    const fenceBody = match[1];
    if (typeof fenceBody !== "string") {
      continue;
    }
    const fencedAck = tryParseJson(fenceBody);
    if (fencedAck) {
      return fencedAck;
    }
  }

  return null;
};

export const isContinuityInternalMessage = (message: SessionMessage): boolean =>
  (message.role === "assistant" || message.role === "thinking") &&
  tryParseContinuityInternalAck(message.content) !== null;
