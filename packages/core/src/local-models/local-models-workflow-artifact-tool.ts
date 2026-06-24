import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  LOCAL_MODELS_WORKFLOW_TEMPERATURE,
  resolveLocalModelsSystemPrompt,
} from "./local-models-prompt-controls";

const WORKFLOW_ARTIFACT_TOOL_NAME = "write_workflow_artifact";
const JSON_HEADERS = { "content-type": "application/json" } as const;
const LEADING_DOT_SLASH_PATTERN = /^\.\/+/u;
const PATH_SEGMENT_SEPARATOR_PATTERN = /[\\/]+/u;
const ARTIFACT_WRITTEN_FALLBACK_RESPONSE = "Готово: артефакт записан.";
const LOCAL_MODELS_MAX_TOOL_STEPS = 4;
const THINKING_FLUSH_MIN_CHARS = 900;
const THINKING_BOUNDARY_MIN_CHARS = 360;
const THINKING_BOUNDARY_REGEX = /(?:\n\n|[.!?。！？…]\s*)$/u;
const LOCAL_MODELS_WORKFLOW_TOOLS = [
  {
    type: "function",
    function: {
      name: WORKFLOW_ARTIFACT_TOOL_NAME,
      description:
        "Write or replace one CodeAI Hub managed workflow artifact. Use this for every required output target artifact instead of pasting the full artifact into chat.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          relative_path: {
            type: "string",
            description:
              "Workspace-relative artifact path. Must start with .codeai-hub/ and must exactly match the runtime target path when one is provided.",
          },
          content: {
            type: "string",
            description: "Complete UTF-8 artifact content to write.",
          },
        },
        required: ["relative_path", "content"],
      },
    },
  },
] as const;
interface LocalModelsWorkflowToolCall {
  readonly arguments: unknown;
  readonly id?: string;
  readonly name: string;
}
interface LocalModelsWorkflowToolMessage {
  readonly content: string;
  readonly role: "tool";
  readonly tool_call_id?: string;
}
interface OpenAiToolCallFunction {
  readonly arguments?: unknown;
  readonly name?: unknown;
}
interface OpenAiToolCall {
  readonly function?: OpenAiToolCallFunction;
  readonly id?: unknown;
  readonly index?: unknown;
  readonly type?: unknown;
}
interface OpenAiChatMessage {
  readonly content?: unknown;
  readonly role: string;
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly OpenAiToolCall[];
}
interface CompleteLocalModelsWorkflowOptions {
  readonly apiModelIdentifier: string;
  readonly baseUrl: string;
  readonly content: string;
  readonly fetchImplementation: typeof fetch;
  readonly maxTokens: number;
  readonly onDelta?: (chunk: string) => void;
  readonly onReasoning?: (chunk: string) => void;
  readonly timeoutMs: number;
  readonly workspacePath: string;
}
interface StreamingToolCallAccumulator {
  arguments: string;
  id?: string;
  index: number;
  name: string;
  type?: string;
}
const buildLocalModelsWorkflowSystemPrompt = (workspacePath?: string): string =>
  [
    resolveLocalModelsSystemPrompt(
      "You are CodeAI Hub's local workflow agent running through LM Studio."
    ),
    "",
    "Runtime environment:",
    "<env>",
    `  Workspace root folder: ${workspacePath ?? "(not provided)"}`,
    `  Today's date: ${new Date().toDateString()}`,
    "</env>",
    "",
    "System behavior:",
    "- Follow the user's workflow prompt as the task contract.",
    "- Treat runtime-provided target artifact paths as authoritative.",
    "- When the prompt asks you to create or rewrite a workflow artifact, call the write_workflow_artifact tool with the exact target relative path and complete file content.",
    "- Do not paste the full artifact body into the chat after a successful write unless the user explicitly asks for it.",
    "- After writing artifacts, answer briefly in the requested chat language with what changed and any critical questions.",
    "- If a required artifact write fails, use the tool error to correct the path or content and try again.",
    "- Never claim that a file was created unless the tool returned success.",
  ].join("\n");
export const completeLocalModelsWorkflowWithTools = async (
  options: CompleteLocalModelsWorkflowOptions
): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const messages: OpenAiChatMessage[] = [
      {
        content: buildLocalModelsWorkflowSystemPrompt(options.workspacePath),
        role: "system",
      },
      { content: options.content, role: "user" },
    ];
    let didWriteArtifact = false;
    for (let step = 1; step <= LOCAL_MODELS_MAX_TOOL_STEPS; step += 1) {
      const message = await requestOpenAiChatCompletion({
        allowEmptyAssistantMessage: didWriteArtifact,
        apiModelIdentifier: options.apiModelIdentifier,
        baseUrl: options.baseUrl,
        fetchImplementation: options.fetchImplementation,
        maxTokens: options.maxTokens,
        messages,
        onDelta: options.onDelta,
        onReasoning: options.onReasoning,
        signal: controller.signal,
        toolsEnabled: !didWriteArtifact,
      });
      const toolCalls = message.tool_calls ?? [];
      const text =
        typeof message.content === "string" ? message.content.trim() : "";
      if (toolCalls.length === 0 && text.length > 0) {
        return text;
      }
      if (didWriteArtifact) {
        return ARTIFACT_WRITTEN_FALLBACK_RESPONSE;
      }
      if (toolCalls.length === 0) {
        throw new Error(
          "LM Studio chat completions returned no assistant message."
        );
      }
      messages.push({
        content: typeof message.content === "string" ? message.content : "",
        role: "assistant",
        tool_calls: toolCalls,
      });
      for (const toolCall of toolCalls) {
        const toolResult = await executeLocalModelsWorkflowToolCall(
          toWorkflowToolCall(toolCall),
          options.workspacePath
        );
        didWriteArtifact ||= toolResult.content.includes('"ok":true');
        messages.push(toolResult);
      }
    }
    if (!didWriteArtifact) {
      throw new Error(
        "LM Studio workflow tool loop exceeded the maximum step count."
      );
    }
    return ARTIFACT_WRITTEN_FALLBACK_RESPONSE;
  } finally {
    clearTimeout(timeout);
  }
};
const executeLocalModelsWorkflowToolCall = async (
  toolCall: LocalModelsWorkflowToolCall,
  workspacePath?: string
): Promise<LocalModelsWorkflowToolMessage> => {
  let content: Record<string, unknown>;
  try {
    content = await executeToolCall(toolCall, workspacePath);
  } catch (error) {
    content = {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      ...(toolCall.id ? { tool_call_id: toolCall.id } : {}),
    };
  }
  return {
    content: JSON.stringify(content),
    role: "tool",
    ...(toolCall.id ? { tool_call_id: toolCall.id } : {}),
  };
};
const requestOpenAiChatCompletion = async (options: {
  readonly allowEmptyAssistantMessage?: boolean;
  readonly apiModelIdentifier: string;
  readonly baseUrl: string;
  readonly fetchImplementation: typeof fetch;
  readonly maxTokens: number;
  readonly messages: readonly OpenAiChatMessage[];
  readonly onDelta?: (chunk: string) => void;
  readonly onReasoning?: (chunk: string) => void;
  readonly signal: AbortSignal;
  readonly toolsEnabled: boolean;
}): Promise<OpenAiChatMessage> => {
  const response = await options
    .fetchImplementation(`${options.baseUrl}/v1/chat/completions`, {
      body: JSON.stringify({
        max_tokens: options.maxTokens,
        messages: options.messages,
        model: options.apiModelIdentifier,
        stream: true,
        temperature: LOCAL_MODELS_WORKFLOW_TEMPERATURE,
        ...(options.toolsEnabled ? { tools: LOCAL_MODELS_WORKFLOW_TOOLS } : {}),
      }),
      headers: JSON_HEADERS,
      method: "POST",
      signal: options.signal,
    })
    .catch((error: unknown) => {
      throw new Error(
        `LM Studio chat completions request failed: ${describeError(error)}`
      );
    });
  if (!response.ok) {
    const diagnosticBody = (await response.text()).trim().slice(0, 500);
    throw new Error(
      diagnosticBody
        ? `LM Studio chat completions request failed with status ${response.status}: ${diagnosticBody}`
        : `LM Studio chat completions request failed with status ${response.status}`
    );
  }
  if (!response.body) {
    throw new Error("LM Studio chat completions stream returned no body.");
  }
  return readOpenAiChatCompletionStream(
    response.body,
    options.onDelta,
    options.onReasoning,
    options.allowEmptyAssistantMessage === true
  );
};
const readOpenAiChatCompletionStream = async (
  body: ReadableStream<Uint8Array>,
  onDelta?: (chunk: string) => void,
  onReasoning?: (chunk: string) => void,
  allowEmptyAssistantMessage = false
): Promise<OpenAiChatMessage> => {
  const contentParts: string[] = [];
  const toolCalls = new Map<number, StreamingToolCallAccumulator>();
  const reasoning = createReasoningFlusher(onReasoning);
  for await (const data of readSseFrames(body)) {
    if (data === "[DONE]") {
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
    const delta = (
      parsed as {
        readonly choices?: readonly { readonly delta?: OpenAiChatMessage }[];
      }
    ).choices?.[0]?.delta;
    if (!delta) {
      continue;
    }
    const reasoningChunk = extractOpenAiReasoningDelta(delta);
    if (reasoningChunk) {
      reasoning.push(reasoningChunk);
    }
    if (typeof delta.content === "string" && delta.content.length > 0) {
      reasoning.flush();
      contentParts.push(delta.content);
      onDelta?.(delta.content);
    }
    for (const toolCall of delta.tool_calls ?? []) {
      reasoning.flush();
      appendStreamingToolCall(toolCalls, toolCall);
    }
  }
  reasoning.flush();
  const content = contentParts.join("").trim();
  const finalToolCalls = [...toolCalls.values()]
    .sort((left, right) => left.index - right.index)
    .map(toOpenAiToolCall);
  if (
    content.length === 0 &&
    finalToolCalls.length === 0 &&
    !allowEmptyAssistantMessage
  ) {
    throw new Error(
      "LM Studio chat completions returned no assistant message."
    );
  }
  return {
    content,
    role: "assistant",
    ...(finalToolCalls.length > 0 ? { tool_calls: finalToolCalls } : {}),
  };
};
const appendStreamingToolCall = (
  toolCalls: Map<number, StreamingToolCallAccumulator>,
  toolCall: OpenAiToolCall
): void => {
  const index = typeof toolCall.index === "number" ? toolCall.index : 0;
  const existing = toolCalls.get(index) ?? {
    arguments: "",
    index,
    name: "",
  };
  const id = typeof toolCall.id === "string" ? toolCall.id : existing.id;
  const type =
    typeof toolCall.type === "string" ? toolCall.type : existing.type;
  const name =
    typeof toolCall.function?.name === "string"
      ? toolCall.function.name
      : existing.name;
  const args =
    typeof toolCall.function?.arguments === "string"
      ? toolCall.function.arguments
      : "";
  toolCalls.set(index, {
    arguments: existing.arguments + args,
    index,
    name,
    ...(id ? { id } : {}),
    ...(type ? { type } : {}),
  });
};
const toOpenAiToolCall = (
  toolCall: StreamingToolCallAccumulator
): OpenAiToolCall => ({
  function: {
    arguments: toolCall.arguments,
    name: toolCall.name,
  },
  ...(toolCall.id ? { id: toolCall.id } : {}),
  ...(toolCall.type ? { type: toolCall.type } : {}),
});
const extractOpenAiReasoningDelta = (
  delta: OpenAiChatMessage
): string | null => {
  const source = delta as unknown as Record<string, unknown>;
  const value = source.reasoning_content ?? source.reasoning;
  return typeof value === "string" && value.length > 0 ? value : null;
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
        const payload = extractSseDataPayload(frame);
        if (payload) {
          yield payload;
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
    const tailPayload = extractSseDataPayload(buffer);
    if (tailPayload) {
      yield tailPayload;
    }
  } finally {
    reader.releaseLock();
  }
};
const extractSseDataPayload = (frame: string): string | null => {
  const dataLines = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart());
  return dataLines.length > 0 ? dataLines.join("\n") : null;
};
const shouldFlushReasoning = (buffer: string): boolean =>
  buffer.length >= THINKING_FLUSH_MIN_CHARS ||
  (buffer.length >= THINKING_BOUNDARY_MIN_CHARS &&
    THINKING_BOUNDARY_REGEX.test(buffer.trimEnd()));
const createReasoningFlusher = (onReasoning?: (chunk: string) => void) => {
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
const toWorkflowToolCall = (
  toolCall: OpenAiToolCall
): LocalModelsWorkflowToolCall => {
  const name =
    typeof toolCall.function?.name === "string"
      ? toolCall.function.name.trim()
      : "";
  if (!name) {
    throw new Error("LM Studio returned a tool call without a function name.");
  }
  const id = typeof toolCall.id === "string" ? toolCall.id : undefined;
  return {
    arguments: toolCall.function?.arguments ?? "{}",
    ...(id ? { id } : {}),
    name,
  };
};
const executeToolCall = async (
  toolCall: LocalModelsWorkflowToolCall,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  if (toolCall.name !== WORKFLOW_ARTIFACT_TOOL_NAME) {
    return {
      error: `Unknown tool: ${toolCall.name}`,
      ok: false,
    };
  }
  if (!workspacePath) {
    return {
      error: "Workspace root is not available for artifact writes.",
      ok: false,
    };
  }
  const args = parseToolArguments(toolCall.arguments);
  const relativePath =
    typeof args.relative_path === "string" ? args.relative_path : "";
  const content = typeof args.content === "string" ? args.content : "";
  const resolved = resolveWorkflowArtifactPath(workspacePath, relativePath);
  await mkdir(path.dirname(resolved.absolutePath), { recursive: true });
  await writeFile(resolved.absolutePath, content, "utf8");
  return {
    bytes: Buffer.byteLength(content, "utf8"),
    ok: true,
    relative_path: resolved.relativePath,
    ...(toolCall.id ? { tool_call_id: toolCall.id } : {}),
  };
};
const parseToolArguments = (value: unknown): Record<string, unknown> => {
  const parsed =
    typeof value === "string" ? (JSON.parse(value || "{}") as unknown) : value;
  if (!isRecord(parsed)) {
    throw new Error("Tool arguments must be a JSON object.");
  }
  return parsed;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
const resolveWorkflowArtifactPath = (
  workspacePath: string,
  rawRelativePath: string
): { readonly absolutePath: string; readonly relativePath: string } => {
  const relativePath = rawRelativePath
    .trim()
    .replace(LEADING_DOT_SLASH_PATTERN, "");
  if (path.isAbsolute(relativePath)) {
    throw new Error("Artifact path must be workspace-relative.");
  }
  if (!relativePath.startsWith(".codeai-hub/")) {
    throw new Error("Artifact path must start with .codeai-hub/.");
  }
  if (relativePath.split(PATH_SEGMENT_SEPARATOR_PATTERN).includes("..")) {
    throw new Error("Artifact path must not contain parent segments.");
  }
  const absolutePath = path.resolve(workspacePath, relativePath);
  const rootWithSeparator = `${path.resolve(workspacePath)}${path.sep}`;
  if (!absolutePath.startsWith(rootWithSeparator)) {
    throw new Error("Artifact path escaped the workspace root.");
  }
  return { absolutePath, relativePath };
};
