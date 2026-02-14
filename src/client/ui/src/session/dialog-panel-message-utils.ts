import type { SessionMessage } from "../../../../types/session";
import type { ProviderTheme } from "./helpers";

export const isSegmentBoundaryMessage = (message: SessionMessage): boolean =>
  message.role === "system" && message.id.startsWith("segment-boundary:");

export const shouldRenderImplicitBoundaryAfter = (
  message: SessionMessage,
  next: SessionMessage | null
): boolean => {
  if (message.role !== "thinking") {
    return false;
  }
  if (!next) {
    return false;
  }
  if (isSegmentBoundaryMessage(next)) {
    return false;
  }
  // When a thinking "header" isn't followed by an assistant card, the canonical
  // negative margin causes the next message to visually collide. In practice
  // this often happens at physical session boundaries (continuity rollover).
  return next.role === "user";
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

export const mergeThinkingMessages = (
  source: readonly SessionMessage[]
): SessionMessage[] => {
  const result: SessionMessage[] = [];
  for (const message of source) {
    if (message.role === "thinking") {
      const previous = result.at(-1);
      if (previous?.role === "thinking") {
        result[result.length - 1] = {
          ...previous,
          content: `${previous.content}\n${message.content}`,
        };
        continue;
      }
      result.push({ ...message });
      continue;
    }
    result.push(message);
  }
  return result;
};
