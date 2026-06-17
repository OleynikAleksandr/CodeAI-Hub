import {
  type GlmTokenUsage,
  type GlmToolCall,
  type GlmToolCallDelta,
  parseGlmSseData,
  readSseDataFrames,
} from "./glm-native-sse-parser";

export interface GlmStreamHandlers {
  readonly onAssistant: (content: string) => void;
  readonly onThinking: (content: string) => void;
  readonly onUsage: (usage: GlmTokenUsage) => void;
}

export interface GlmStreamReadResult {
  readonly content: string;
  readonly emittedUsefulEvent: boolean;
  readonly reasoningContent: string;
  readonly toolCalls: readonly GlmToolCall[];
}

const THINKING_STREAM_FLUSH_MIN_CHARS = 900;
const THINKING_STREAM_BOUNDARY_MIN_CHARS = 360;
const THINKING_STREAM_BOUNDARY_REGEX = /(?:\n\n|[.!?。！？]\s*)$/u;

const shouldFlushThinking = (content: string): boolean => {
  if (content.length >= THINKING_STREAM_FLUSH_MIN_CHARS) {
    return true;
  }
  return (
    content.length >= THINKING_STREAM_BOUNDARY_MIN_CHARS &&
    THINKING_STREAM_BOUNDARY_REGEX.test(content.trimEnd())
  );
};

const applyToolCallDelta = (
  calls: Map<
    number,
    {
      arguments: string;
      id?: string;
      name?: string;
      type?: string;
    }
  >,
  delta: GlmToolCallDelta
): void => {
  const current = calls.get(delta.index) ?? { arguments: "" };
  calls.set(delta.index, {
    arguments: current.arguments + (delta.function?.arguments ?? ""),
    id: delta.id ?? current.id,
    name: delta.function?.name ?? current.name,
    type: delta.type ?? current.type,
  });
};

const buildToolCalls = (
  calls: Map<number, { arguments: string; id?: string; name?: string }>
): readonly GlmToolCall[] =>
  [...calls.entries()]
    .sort(([left], [right]) => left - right)
    .flatMap(([index, call]) =>
      call.name
        ? [
            {
              function: {
                arguments: call.arguments,
                name: call.name,
              },
              id: call.id ?? `call_${index}`,
              type: "function" as const,
            },
          ]
        : []
    );

export const readGlmStreamResponse = async (
  body: AsyncIterable<Uint8Array>,
  handlers: GlmStreamHandlers
): Promise<GlmStreamReadResult> => {
  let assistantContent = "";
  let emittedUsefulEvent = false;
  let pendingThinking = "";
  let reasoningContent = "";
  const toolCalls = new Map<
    number,
    { arguments: string; id?: string; name?: string }
  >();
  const flushThinking = (): void => {
    if (pendingThinking.length === 0) {
      return;
    }
    handlers.onThinking(pendingThinking);
    pendingThinking = "";
  };
  for await (const data of readSseDataFrames(body)) {
    const chunk = parseGlmSseData(data);
    if (!chunk) {
      continue;
    }
    emittedUsefulEvent = true;
    if (chunk.reasoning) {
      reasoningContent += chunk.reasoning;
      pendingThinking += chunk.reasoning;
      if (shouldFlushThinking(pendingThinking)) {
        flushThinking();
      }
    }
    if (chunk.content) {
      flushThinking();
      assistantContent += chunk.content;
      handlers.onAssistant(chunk.content);
    }
    for (const toolCallDelta of chunk.toolCallDeltas ?? []) {
      flushThinking();
      applyToolCallDelta(toolCalls, toolCallDelta);
    }
    if (chunk.usage) {
      handlers.onUsage(chunk.usage);
    }
  }
  flushThinking();
  return {
    content: assistantContent,
    emittedUsefulEvent,
    reasoningContent,
    toolCalls: buildToolCalls(toolCalls),
  };
};
