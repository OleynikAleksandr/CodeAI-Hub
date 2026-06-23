const DATA_LINE_PREFIX = "data:";
const DONE_SENTINEL = "[DONE]";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractDataPayload = (frame: string): string | null => {
  const dataLines = frame
    .split("\n")
    .filter((line) => line.startsWith(DATA_LINE_PREFIX))
    .map((line) => line.slice(DATA_LINE_PREFIX.length).trimStart());
  return dataLines.length > 0 ? dataLines.join("\n") : null;
};

const readSseFrames = async function* (
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/gu, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const payload = extractDataPayload(frame);
        if (payload) {
          yield payload;
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
    const tailPayload = extractDataPayload(buffer);
    if (tailPayload) {
      yield tailPayload;
    }
  } finally {
    reader.releaseLock();
  }
};

interface OpenRouterDelta {
  readonly content?: unknown;
  readonly reasoning?: unknown;
  readonly reasoning_content?: unknown;
  readonly tool_calls?: unknown;
}

export interface OpenRouterToolCall {
  readonly function: {
    readonly arguments: string;
    readonly name: string;
  };
  readonly id: string;
  readonly type: "function";
}

interface OpenRouterToolCallDelta {
  readonly function?: {
    readonly arguments?: string;
    readonly name?: string;
  };
  readonly id?: string;
  readonly index: number;
  readonly type?: string;
}

interface OpenRouterStreamChoice {
  readonly delta?: OpenRouterDelta;
}

interface OpenRouterStreamChunk {
  readonly choices?: readonly OpenRouterStreamChoice[];
  readonly model?: unknown;
  readonly usage?: unknown;
}

export interface OpenRouterStreamResult {
  readonly content: string;
  readonly model?: string;
  readonly toolCalls: readonly OpenRouterToolCall[];
  readonly usage?: unknown;
}

interface OpenRouterStreamAccumulator {
  model?: string;
  readonly parts: string[];
  readonly toolCallsByIndex: Map<number, OpenRouterMutableToolCall>;
  usage?: unknown;
}

interface OpenRouterMutableToolCall {
  arguments: string;
  id?: string;
  name?: string;
  type?: string;
}

const parseSseJson = (data: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(data);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const readNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const readToolCallDeltas = (
  value: unknown
): readonly OpenRouterToolCallDelta[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const deltas: OpenRouterToolCallDelta[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const index = readNumber(item.index);
    const fn = isRecord(item.function) ? item.function : null;
    if (index === undefined) {
      continue;
    }
    deltas.push({
      index,
      ...(readString(item.id) ? { id: String(item.id) } : {}),
      ...(readString(item.type) ? { type: String(item.type) } : {}),
      ...(fn
        ? {
            function: {
              ...(readString(fn.arguments) === undefined
                ? {}
                : { arguments: String(fn.arguments) }),
              ...(readString(fn.name) ? { name: String(fn.name) } : {}),
            },
          }
        : {}),
    });
  }
  return deltas;
};

const applyToolCallDeltas = (
  deltas: readonly OpenRouterToolCallDelta[],
  accumulator: OpenRouterStreamAccumulator
): void => {
  for (const delta of deltas) {
    const current = accumulator.toolCallsByIndex.get(delta.index) ?? {
      arguments: "",
    };
    accumulator.toolCallsByIndex.set(delta.index, {
      arguments: current.arguments + (delta.function?.arguments ?? ""),
      id: delta.id ?? current.id,
      name: delta.function?.name ?? current.name,
      type: delta.type ?? current.type,
    });
  }
};

const materializeToolCalls = (
  accumulator: OpenRouterStreamAccumulator
): readonly OpenRouterToolCall[] =>
  Array.from(accumulator.toolCallsByIndex.entries())
    .sort(([left], [right]) => left - right)
    .map(([index, call]) => ({
      function: {
        arguments: call.arguments,
        name: call.name ?? "",
      },
      id: call.id ?? `call_${index}`,
      type: "function" as const,
    }))
    .filter((call) => call.function.name.length > 0);

const applyStreamChunk = (
  chunk: OpenRouterStreamChunk,
  accumulator: OpenRouterStreamAccumulator,
  onDelta?: (chunk: string) => void,
  onReasoning?: (chunk: string) => void
): void => {
  if (typeof chunk.model === "string") {
    accumulator.model = chunk.model;
  }
  if (chunk.usage !== undefined) {
    accumulator.usage = chunk.usage;
  }
  const delta = chunk.choices?.[0]?.delta;
  if (!delta) {
    return;
  }
  if (typeof delta.content === "string" && delta.content.length > 0) {
    accumulator.parts.push(delta.content);
    onDelta?.(delta.content);
  }
  const reasoning = delta.reasoning ?? delta.reasoning_content;
  if (typeof reasoning === "string" && reasoning.length > 0) {
    onReasoning?.(reasoning);
  }
  applyToolCallDeltas(readToolCallDeltas(delta.tool_calls), accumulator);
};

export const readOpenRouterChatCompletionStream = async (
  response: Response,
  onDelta?: (chunk: string) => void,
  onReasoning?: (chunk: string) => void
): Promise<OpenRouterStreamResult> => {
  if (!response.body) {
    throw new Error("OpenRouter chat completion stream returned no body.");
  }
  const accumulator: OpenRouterStreamAccumulator = {
    parts: [],
    toolCallsByIndex: new Map(),
  };
  for await (const data of readSseFrames(response.body)) {
    if (data === DONE_SENTINEL) {
      break;
    }
    const parsed = parseSseJson(data);
    if (!parsed) {
      continue;
    }
    applyStreamChunk(
      parsed as OpenRouterStreamChunk,
      accumulator,
      onDelta,
      onReasoning
    );
  }
  const content = accumulator.parts.join("").trim();
  const toolCalls = materializeToolCalls(accumulator);
  if (content.length === 0 && toolCalls.length === 0) {
    throw new Error("OpenRouter chat completion stream returned no content.");
  }
  return {
    content,
    ...(accumulator.model ? { model: accumulator.model } : {}),
    toolCalls,
    ...(accumulator.usage === undefined ? {} : { usage: accumulator.usage }),
  };
};

interface OpenRouterMessage {
  readonly content: string;
  readonly role: "assistant" | "system" | "tool" | "user";
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly OpenRouterToolCall[];
}

export interface OpenRouterChatCompletionRequestOptions {
  readonly endpointTag?: string;
  readonly messages: readonly OpenRouterMessage[];
  readonly model: string;
  readonly toolChoice?: "auto";
  readonly tools?: readonly unknown[];
}

export const createOpenRouterChatCompletionRequest = (
  options: OpenRouterChatCompletionRequestOptions
): Record<string, unknown> => ({
  messages: options.messages,
  model: options.model,
  stream: true,
  ...(options.tools && options.tools.length > 0
    ? { tool_choice: options.toolChoice ?? "auto", tools: options.tools }
    : {}),
  ...(options.endpointTag
    ? { provider: { allow_fallbacks: false, order: [options.endpointTag] } }
    : {}),
});
