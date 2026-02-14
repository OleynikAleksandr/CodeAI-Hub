import type {
  SessionMessage,
  SessionSnapshot,
} from "../../../../types/session";

const SYSTEM_PROMPT_PREFIXES = ["# System Prompt", "System Prompt —"];

const isSystemPromptBootstrapMessage = (message: SessionMessage): boolean => {
  if (message.role !== "user") {
    return false;
  }
  const trimmed = message.content.trimStart();
  return SYSTEM_PROMPT_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
};

export const dedupeVirtualConversationMessages = (
  messages: readonly SessionMessage[]
): readonly SessionMessage[] => {
  const seen = new Set<string>();
  const unique: SessionMessage[] = [];
  for (const message of messages) {
    // UI-only stable identity: if we see the same content with the same createdAt
    // again, it's a replay/duplicate and should not be shown multiple times.
    const key = `${message.role}|${message.createdAt}|${message.content}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(message);
  }
  return unique;
};

const resolveChainSegmentStartIndex = (options: {
  readonly snapshot: SessionSnapshot;
  readonly segmentIndex: number;
}): number | null => {
  if (options.segmentIndex === 0) {
    return 0;
  }

  const firstUserIndex = options.snapshot.messages.findIndex(
    (message) => message.role === "user"
  );
  if (firstUserIndex < 0) {
    return null;
  }

  // Each continuation segment bootstraps with a system prompt; keep it only
  // for the first segment to avoid UI repeats.
  let startIndex = firstUserIndex;
  while (startIndex < options.snapshot.messages.length) {
    const message = options.snapshot.messages[startIndex];
    if (message && isSystemPromptBootstrapMessage(message)) {
      startIndex += 1;
      continue;
    }
    break;
  }

  return startIndex < options.snapshot.messages.length ? startIndex : null;
};

export const collectChainSegmentMessages = (options: {
  readonly snapshot: SessionSnapshot;
  readonly segmentIndex: number;
  readonly lastSegmentIndex: number;
}): readonly SessionMessage[] => {
  const startIndex =
    resolveChainSegmentStartIndex({
      snapshot: options.snapshot,
      segmentIndex: options.segmentIndex,
    }) ?? null;
  if (startIndex === null) {
    return [];
  }

  const shouldSuppressThinking =
    options.segmentIndex < options.lastSegmentIndex;
  const sliced = options.snapshot.messages.slice(startIndex);
  if (!shouldSuppressThinking) {
    return sliced;
  }
  return sliced.filter((message) => message.role !== "thinking");
};
