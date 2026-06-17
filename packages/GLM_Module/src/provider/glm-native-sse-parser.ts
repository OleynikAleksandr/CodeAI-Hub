export interface GlmTokenUsage {
  readonly cachedTokens?: number;
  readonly completionTokens: number;
  readonly promptTokens: number;
  readonly reasoningTokens?: number;
  readonly totalTokens: number;
}

export interface GlmStreamChunk {
  readonly content?: string;
  readonly reasoning?: string;
  readonly toolCallDeltas?: readonly GlmToolCallDelta[];
  readonly usage?: GlmTokenUsage;
}

export interface GlmToolCall {
  readonly function: {
    readonly arguments: string;
    readonly name: string;
  };
  readonly id: string;
  readonly type: "function";
}

export interface GlmToolCallDelta {
  readonly function?: {
    readonly arguments?: string;
    readonly name?: string;
  };
  readonly id?: string;
  readonly index: number;
  readonly type?: string;
}

const FRAME_LINE_PATTERN = /\r?\n/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const readMaybeString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;

export const parseGlmUsage = (value: unknown): GlmTokenUsage | null => {
  if (!isRecord(value)) {
    return null;
  }
  const promptTokens = readNumber(value.prompt_tokens);
  const completionTokens = readNumber(value.completion_tokens);
  const totalTokens = readNumber(value.total_tokens);
  if (
    promptTokens === null ||
    completionTokens === null ||
    totalTokens === null
  ) {
    return null;
  }
  const promptDetails = isRecord(value.prompt_tokens_details)
    ? value.prompt_tokens_details
    : null;
  const completionDetails = isRecord(value.completion_tokens_details)
    ? value.completion_tokens_details
    : null;
  const cachedTokens = readNumber(promptDetails?.cached_tokens);
  const reasoningTokens = readNumber(completionDetails?.reasoning_tokens);
  return {
    completionTokens,
    promptTokens,
    totalTokens,
    ...(cachedTokens === null ? {} : { cachedTokens }),
    ...(reasoningTokens === null ? {} : { reasoningTokens }),
  };
};

const parseGlmToolCallDeltas = (
  value: unknown
): readonly GlmToolCallDelta[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const deltas: GlmToolCallDelta[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const index = readNumber(item.index);
    if (index === null) {
      continue;
    }
    const fn = isRecord(item.function) ? item.function : null;
    const argumentsDelta = readMaybeString(fn?.arguments);
    const functionName = readString(fn?.name);
    const id = readString(item.id);
    const type = readString(item.type);
    deltas.push({
      ...(fn
        ? {
            function: {
              ...(argumentsDelta === undefined
                ? {}
                : { arguments: argumentsDelta }),
              ...(functionName ? { name: functionName } : {}),
            },
          }
        : {}),
      ...(id ? { id } : {}),
      index,
      ...(type ? { type } : {}),
    });
  }
  return deltas;
};

export const parseGlmSseData = (data: string): GlmStreamChunk | null => {
  const trimmed = data.trim();
  if (trimmed.length === 0 || trimmed === "[DONE]") {
    return null;
  }
  const parsed = JSON.parse(trimmed) as unknown;
  if (!isRecord(parsed)) {
    return null;
  }
  const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
  const firstChoice = choices.find(isRecord);
  const delta = isRecord(firstChoice?.delta) ? firstChoice.delta : null;
  const reasoning = readString(delta?.reasoning_content);
  const content = readString(delta?.content);
  const toolCallDeltas = parseGlmToolCallDeltas(delta?.tool_calls);
  const usage = parseGlmUsage(parsed.usage);
  if (!(reasoning || content || toolCallDeltas.length > 0 || usage)) {
    return null;
  }
  return {
    ...(content ? { content } : {}),
    ...(reasoning ? { reasoning } : {}),
    ...(toolCallDeltas.length > 0 ? { toolCallDeltas } : {}),
    ...(usage ? { usage } : {}),
  };
};

export async function* readSseDataFrames(
  body: AsyncIterable<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = frame
        .split(FRAME_LINE_PATTERN)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data.length > 0) {
        yield data;
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
  const tail = buffer.trim();
  if (tail.startsWith("data:")) {
    yield tail.slice(5).trimStart();
  }
}
