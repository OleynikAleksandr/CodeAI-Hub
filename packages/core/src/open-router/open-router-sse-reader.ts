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
  readonly usage?: unknown;
}

interface OpenRouterStreamAccumulator {
  model?: string;
  readonly parts: string[];
  usage?: unknown;
}

const parseSseJson = (data: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(data);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

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
};

export const readOpenRouterChatCompletionStream = async (
  response: Response,
  onDelta?: (chunk: string) => void,
  onReasoning?: (chunk: string) => void
): Promise<OpenRouterStreamResult> => {
  if (!response.body) {
    throw new Error("OpenRouter chat completion stream returned no body.");
  }
  const accumulator: OpenRouterStreamAccumulator = { parts: [] };
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
  if (content.length === 0) {
    throw new Error("OpenRouter chat completion stream returned no content.");
  }
  return {
    content,
    ...(accumulator.model ? { model: accumulator.model } : {}),
    ...(accumulator.usage === undefined ? {} : { usage: accumulator.usage }),
  };
};

interface OpenRouterMessage {
  readonly content: string;
  readonly role: "assistant" | "system" | "user";
}

export interface OpenRouterChatCompletionRequestOptions {
  readonly endpointTag?: string;
  readonly messages: readonly OpenRouterMessage[];
  readonly model: string;
}

export const createOpenRouterChatCompletionRequest = (
  options: OpenRouterChatCompletionRequestOptions
): Record<string, unknown> => ({
  messages: options.messages,
  model: options.model,
  stream: true,
  ...(options.endpointTag
    ? { provider: { allow_fallbacks: false, order: [options.endpointTag] } }
    : {}),
});
