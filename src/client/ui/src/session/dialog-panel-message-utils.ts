import type { SessionMessage } from "../../../../types/session";
import type { ProviderTheme } from "./helpers";

const SEGMENT_BOUNDARY_MARKER = "__CODEAIHUB_SEGMENT_BOUNDARY__";

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
  if (message.role === "assistant" && providerTheme) {
    classes.push(`session-dialog__message--assistant-${providerTheme}`);
  }
  return classes.join(" ");
};

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

const isAssistantThinkingMessage = (message: SessionMessage): boolean =>
  message.role === "assistant" && message.tag === "thinking";

const isThinkingDisplayMessage = (message: SessionMessage): boolean =>
  message.role === "thinking" || isAssistantThinkingMessage(message);

const mergeThinkingDisplayMessage = (
  previous: SessionMessage,
  next: SessionMessage
): SessionMessage => {
  const useAssistantThinking =
    isAssistantThinkingMessage(previous) || isAssistantThinkingMessage(next);
  return {
    ...previous,
    content: `${previous.content}\n${next.content}`,
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
