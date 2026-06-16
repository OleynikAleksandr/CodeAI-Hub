import { randomUUID } from "node:crypto";
import type { GlmOpenCodeSessionEvent } from "./glm-opencode-output-normalizer";

const MIN_REASONING_FLUSH_CHARS = 160;
const REASONING_FLUSH_BOUNDARY_PATTERN = /(?:\n\n|[.!?]\s|\n)$/u;

export const buildOpenCodePromptFailure = (result: {
  readonly error?: {
    readonly data?: {
      readonly message?: string;
      readonly ref?: string;
    };
    readonly name?: string;
  };
  readonly response?: {
    readonly ok?: boolean;
    readonly status?: number;
  };
}): string | null => {
  const responseOk = result.response?.ok;
  if (responseOk !== false && !result.error) {
    return null;
  }
  const responseStatus = result.response?.status;
  const details =
    result.error?.data?.message?.trim() ||
    result.error?.name?.trim() ||
    "OpenCode prompt request failed.";
  return responseStatus
    ? `OpenCode prompt failed with HTTP ${responseStatus}: ${details}`
    : details;
};

export const shouldFlushOpenCodeReasoningBuffer = (buffer: string): boolean =>
  buffer.includes("\n\n") ||
  (buffer.length >= MIN_REASONING_FLUSH_CHARS &&
    REASONING_FLUSH_BOUNDARY_PATTERN.test(buffer));

export const emitOpenCodeThinkingChunk = (
  chunk: string,
  onEvent: (event: GlmOpenCodeSessionEvent) => void
): void => {
  if (chunk.trim().length === 0) {
    return;
  }
  onEvent({
    content: chunk,
    provider: "glmOpenCode",
    tag: "thinking",
    timestamp: new Date().toISOString(),
    type: "thinking",
    uuid: `${randomUUID()}::thinking`,
  });
};
