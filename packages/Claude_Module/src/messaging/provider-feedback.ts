import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage } from "../types";

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const logObservedProviderFeedback = (
  session: ActiveSession,
  message: ClaudeStreamMessage
): void => {
  const sessionId = readNonEmptyString(message.session_id);
  const model = readNonEmptyString(message.message?.model);
  const timestamp =
    readNonEmptyString(message.timestamp) ?? new Date().toISOString();
  if (model) {
    session.logger?.logSDKMessage("provider_feedback", {
      provider: "claude",
      feedbackType: "message_model",
      sessionId,
      model,
      timestamp,
    });
  }

  const blocks = message.message?.content;
  if (!Array.isArray(blocks)) {
    return;
  }
  for (const block of blocks) {
    const thinking = readNonEmptyString(
      (block as { readonly thinking?: unknown }).thinking
    );
    if (
      !(block && typeof block === "object") ||
      (block as { readonly type?: unknown }).type !== "thinking" ||
      !thinking
    ) {
      continue;
    }
    session.logger?.logSDKMessage("provider_feedback", {
      provider: "claude",
      feedbackType: "thinking_block",
      sessionId,
      model,
      thinkingChars: thinking.length,
      timestamp,
    });
  }
};
