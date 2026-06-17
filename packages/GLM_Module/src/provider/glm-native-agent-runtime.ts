import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GlmRuntimeProfile } from "./glm-native-runtime-profile";
import type { GlmToolCall } from "./glm-native-sse-parser";

const WORKFLOW_ARTIFACT_TOOL_NAME = "write_workflow_artifact";
const LEADING_DOT_SLASH_PATTERN = /^\.\/+/u;
const PATH_SEGMENT_SEPARATOR_PATTERN = /[\\/]+/u;

export const GLM_NATIVE_MAX_TOOL_STEPS = 4;

export const GLM_NATIVE_WORKFLOW_TOOLS = [
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

const buildGlmNativeSystemInstruction = (profile: GlmRuntimeProfile): string =>
  [
    "You are CodeAI Hub's native GLM workflow agent.",
    "",
    "Runtime environment:",
    "<env>",
    `  Model: ${profile.model}`,
    `  Workspace root folder: ${profile.workspacePath ?? "(not provided)"}`,
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

export const buildGlmNativeSystemMessage = (
  profile: GlmRuntimeProfile
): GlmSessionMessage => ({
  content: buildGlmNativeSystemInstruction(profile),
  role: "system",
});

export interface GlmSessionMessage {
  readonly content: string;
  readonly reasoning_content?: string;
  readonly role: string;
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly GlmToolCall[];
}

export const executeGlmNativeToolCall = async (
  toolCall: GlmToolCall,
  workspacePath?: string
): Promise<GlmSessionMessage> => {
  const content = await executeToolCallSafely(toolCall, workspacePath);
  return {
    content: JSON.stringify(content),
    role: "tool",
    tool_call_id: toolCall.id,
  };
};

const executeToolCallSafely = async (
  toolCall: GlmToolCall,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  try {
    return await executeToolCall(toolCall, workspacePath);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      tool_call_id: toolCall.id,
    };
  }
};

const executeToolCall = async (
  toolCall: GlmToolCall,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  if (toolCall.function.name !== WORKFLOW_ARTIFACT_TOOL_NAME) {
    return {
      error: `Unknown tool: ${toolCall.function.name}`,
      ok: false,
    };
  }
  if (!workspacePath) {
    return {
      error: "Workspace root is not available for artifact writes.",
      ok: false,
    };
  }
  const args = parseToolArguments(toolCall.function.arguments);
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
    tool_call_id: toolCall.id,
  };
};

const parseToolArguments = (value: string): Record<string, unknown> => {
  const parsed = JSON.parse(value || "{}") as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Tool arguments must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
};

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
  const workspaceRoot = path.resolve(workspacePath);
  const rootWithSeparator = `${workspaceRoot}${path.sep}`;
  if (
    !(
      absolutePath === workspaceRoot ||
      absolutePath.startsWith(rootWithSeparator)
    )
  ) {
    throw new Error("Artifact path escaped the workspace root.");
  }
  return { absolutePath, relativePath };
};

export const buildGlmNativeAssistantToolMessage = (result: {
  readonly content: string;
  readonly reasoningContent: string;
  readonly toolCalls: readonly GlmToolCall[];
}): GlmSessionMessage => ({
  content: result.content,
  ...(result.reasoningContent.trim().length > 0
    ? { reasoning_content: result.reasoningContent }
    : {}),
  role: "assistant",
  tool_calls: result.toolCalls.map((call) => ({
    ...call,
    id: call.id || `call_${randomUUID()}`,
  })),
});
