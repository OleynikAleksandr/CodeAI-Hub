import type { OpencodeClient } from "./glm-opencode-sdk-loader";
import type { OpenCodeEventPayload } from "./glm-opencode-sse-processor";
import {
  createAssistantPartAccumulator,
  emitFinalOpenCodeAssistantArtifacts,
  processOpenCodeSsePayload,
} from "./glm-opencode-sse-processor";
import { buildOpenCodePromptFailure } from "./glm-opencode-stream-helpers";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const splitModelSelector = (
  modelSelector: string
): { readonly modelID: string; readonly providerID: string } => {
  const separator = modelSelector.indexOf("/");
  if (separator <= 0 || separator === modelSelector.length - 1) {
    throw new Error(`Invalid OpenCode model selector: ${modelSelector}`);
  }
  return {
    modelID: modelSelector.slice(separator + 1),
    providerID: modelSelector.slice(0, separator),
  };
};

const buildEventUrl = (
  serverUrl: string,
  workspacePath: string | undefined
): URL => {
  const url = new URL("/event", serverUrl);
  if (workspacePath) {
    url.searchParams.set("directory", workspacePath);
  }
  return url;
};

const parseSsePayload = (rawEvent: string): OpenCodeEventPayload | null => {
  const dataLines = rawEvent
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());
  if (dataLines.length === 0) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(dataLines.join("\n"));
    return isRecord(parsed) ? (parsed as OpenCodeEventPayload) : null;
  } catch {
    return null;
  }
};

export { resolveOpenCodeUnseenTextTail } from "./glm-opencode-sse-processor";

export const createOpenCodeRemoteSession = async (
  client: OpencodeClient,
  workspacePath: string | undefined
): Promise<string> => {
  const response = await client.session.create({
    directory: workspacePath,
    title: "codeai-hub",
  });
  const sessionId = readString(response.data?.id);
  if (!sessionId) {
    throw new Error("OpenCode session creation did not return a session id.");
  }
  return sessionId;
};

export const abortOpenCodeRemoteSession = async (
  client: OpencodeClient,
  remoteSessionId: string,
  workspacePath: string | undefined
): Promise<void> => {
  await client.session.abort({
    directory: workspacePath,
    sessionID: remoteSessionId,
  });
};

export const deleteOpenCodeRemoteSession = async (
  client: OpencodeClient,
  remoteSessionId: string,
  workspacePath: string | undefined
): Promise<void> => {
  await client.session.delete({
    directory: workspacePath,
    sessionID: remoteSessionId,
  });
};

export const streamOpenCodeTurn = async (params: {
  readonly abortSignal: AbortSignal;
  readonly client: OpencodeClient;
  readonly content: string;
  readonly modelSelector: string;
  readonly onEvent: (event: {
    readonly content?: string;
    readonly data?: Record<string, unknown>;
    readonly message?: string;
    readonly provider?: string;
    readonly tag?: string;
    readonly timestamp?: string;
    readonly type: string;
    readonly uuid?: string;
  }) => void;
  readonly remoteSessionId: string;
  readonly serverUrl: string;
  readonly workspacePath?: string;
}): Promise<void> => {
  const streamResponse = await fetch(
    buildEventUrl(params.serverUrl, params.workspacePath),
    { signal: params.abortSignal }
  );
  if (!(streamResponse.ok && streamResponse.body)) {
    throw new Error(
      `OpenCode event stream failed: HTTP ${streamResponse.status}.`
    );
  }

  const promptResult = await params.client.session.promptAsync({
    directory: params.workspacePath,
    sessionID: params.remoteSessionId,
    model: splitModelSelector(params.modelSelector),
    parts: [{ text: params.content, type: "text" }],
  });
  const promptFailure = buildOpenCodePromptFailure(promptResult);
  if (promptFailure) {
    throw new Error(promptFailure);
  }

  const accumulator = createAssistantPartAccumulator();
  const assistantMessageIds = new Set<string>();
  const decoder = new TextDecoder();
  const reader = streamResponse.body.getReader();
  let buffer = "";

  try {
    while (true) {
      const readResult = await reader.read();
      if (readResult.done) {
        break;
      }
      buffer += decoder.decode(readResult.value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const rawEvent of chunks) {
        const payload = parseSsePayload(rawEvent);
        if (!payload) {
          continue;
        }
        const status = processOpenCodeSsePayload({
          accumulator,
          assistantMessageIds,
          onEvent: params.onEvent,
          payload,
          remoteSessionId: params.remoteSessionId,
        });
        if (status !== "completed") {
          continue;
        }
        emitFinalOpenCodeAssistantArtifacts(accumulator, params.onEvent);
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
};
