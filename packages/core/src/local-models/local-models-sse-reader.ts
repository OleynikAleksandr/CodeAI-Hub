const DATA_LINE_PREFIX = "data:";
const MESSAGE_DELTA_EVENT_TYPE = "message.delta";
const REASONING_DELTA_EVENT_TYPE = "reasoning.delta";
const TERMINAL_NATIVE_EVENT_TYPE = "chat.end";
const TOOL_CALL_ARGUMENTS_EVENT_TYPE = "tool_call.arguments";
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
      buffer += decoder.decode(value, { stream: true });
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

interface NativeMessageDelta {
  readonly content?: unknown;
}

export interface LmStudioNativeToolCall {
  readonly arguments: Record<string, unknown>;
  readonly name: string;
  readonly providerInfo?: Record<string, unknown>;
}

const extractDeltaContent = (
  parsed: Record<string, unknown>
): string | null => {
  const content = (parsed as NativeMessageDelta).content;
  return typeof content === "string" && content.length > 0 ? content : null;
};

const extractToolCall = (
  parsed: Record<string, unknown>
): LmStudioNativeToolCall | null => {
  if (parsed.type !== TOOL_CALL_ARGUMENTS_EVENT_TYPE) {
    return null;
  }
  const name = typeof parsed.tool === "string" ? parsed.tool.trim() : "";
  const args = parsed.arguments;
  if (!(name && isRecord(args))) {
    return null;
  }
  const providerInfo = isRecord(parsed.provider_info)
    ? parsed.provider_info
    : undefined;
  return {
    arguments: args,
    name,
    ...(providerInfo ? { providerInfo } : {}),
  };
};

const THINKING_FLUSH_MIN_CHARS = 900;
const THINKING_BOUNDARY_MIN_CHARS = 360;
const THINKING_BOUNDARY_REGEX = /(?:\n\n|[.!?。！？…]\s*)$/u;

const shouldFlushReasoning = (buffer: string): boolean => {
  if (buffer.length >= THINKING_FLUSH_MIN_CHARS) {
    return true;
  }
  return (
    buffer.length >= THINKING_BOUNDARY_MIN_CHARS &&
    THINKING_BOUNDARY_REGEX.test(buffer.trimEnd())
  );
};

interface ReasoningFlusher {
  readonly flush: () => void;
  readonly push: (chunk: string) => void;
}

// Reasoning arrives as hundreds of tiny `reasoning.delta` frames; emitting one
// thinking message per frame renders "letter per line". Buffer reasoning and
// flush only on a size/sentence boundary (mirroring GLM native), plus a flush
// when message content starts or the stream ends.
const createReasoningFlusher = (
  onReasoning?: (chunk: string) => void
): ReasoningFlusher => {
  let pending = "";
  const flush = (): void => {
    if (onReasoning && pending.length > 0) {
      onReasoning(pending);
    }
    pending = "";
  };
  return {
    flush,
    push(chunk: string): void {
      if (!onReasoning) {
        return;
      }
      pending += chunk;
      if (shouldFlushReasoning(pending)) {
        flush();
      }
    },
  };
};

const dispatchDeltaFrame = (
  parsed: Record<string, unknown>,
  reasoning: ReasoningFlusher,
  onDelta?: (chunk: string) => void,
  onToolCall?: (toolCall: LmStudioNativeToolCall) => void
): void => {
  if (parsed.type === MESSAGE_DELTA_EVENT_TYPE) {
    const delta = extractDeltaContent(parsed);
    if (delta) {
      reasoning.flush();
      onDelta?.(delta);
    }
  }
  if (parsed.type === REASONING_DELTA_EVENT_TYPE) {
    const chunk = extractDeltaContent(parsed);
    if (chunk) {
      reasoning.push(chunk);
    }
  }
  const toolCall = extractToolCall(parsed);
  if (toolCall) {
    reasoning.flush();
    onToolCall?.(toolCall);
  }
};

export const readLmStudioNativeChatResult = async (
  response: Response,
  onDelta?: (chunk: string) => void,
  onReasoning?: (chunk: string) => void,
  onToolCall?: (toolCall: LmStudioNativeToolCall) => void
): Promise<unknown> => {
  if (!response.body) {
    throw new Error("LM Studio native chat stream returned no body.");
  }
  let terminalResult: unknown = null;
  const reasoning = createReasoningFlusher(onReasoning);
  for await (const data of readSseFrames(response.body)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) {
      continue;
    }
    if (parsed.type === TERMINAL_NATIVE_EVENT_TYPE) {
      reasoning.flush();
      terminalResult = parsed.result ?? null;
      break;
    }
    dispatchDeltaFrame(parsed, reasoning, onDelta, onToolCall);
  }
  reasoning.flush();
  if (terminalResult === null) {
    throw new Error(
      "LM Studio native chat stream ended without a chat.end event."
    );
  }
  return terminalResult;
};

interface CompletionsDelta {
  readonly content?: unknown;
}
interface CompletionsStreamChoice {
  readonly delta?: CompletionsDelta;
}
interface CompletionsStreamChunk {
  readonly choices?: readonly CompletionsStreamChoice[];
}

export const readLmStudioCompletionsText = async (
  response: Response
): Promise<string | null> => {
  if (!response.body) {
    return null;
  }
  const parts: string[] = [];
  for await (const data of readSseFrames(response.body)) {
    if (data === DONE_SENTINEL) {
      break;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) {
      continue;
    }
    const delta = (parsed as CompletionsStreamChunk).choices?.[0]?.delta
      ?.content;
    if (typeof delta === "string") {
      parts.push(delta);
    }
  }
  const text = parts.join("").trim();
  return text.length > 0 ? text : null;
};
