import { exec } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  CODEX_NATIVE_SYSTEM_INSTRUCTIONS,
  CODEX_NATIVE_TOOL_DEFINITIONS_JSON,
} from "./codex-native-baseline";
import type { GlmRuntimeProfile } from "./glm-native-runtime-profile";
import type { GlmToolCall } from "./glm-native-sse-parser";

const WORKFLOW_ARTIFACT_TOOL_NAME = "write_workflow_artifact";
const EXEC_COMMAND_TOOL_NAME = "exec_command";
const LEADING_DOT_SLASH_PATTERN = /^\.\/+/u;
const PATH_SEGMENT_SEPARATOR_PATTERN = /[\\/]+/u;
const execAsync = promisify(exec);

export const GLM_NATIVE_MAX_TOOL_STEPS = 64;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

interface GlmNativeToolDefinition {
  readonly function: {
    readonly description: string;
    readonly name: string;
    readonly parameters: Record<string, unknown>;
  };
  readonly type: "function";
}

const EMPTY_PARAMETERS_SCHEMA = {
  additionalProperties: false,
  properties: {},
  type: "object",
};

export const GLM_NATIVE_WORKFLOW_TOOLS: readonly GlmNativeToolDefinition[] = [
  ...buildCodexNativeGlmTools(),
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
];

const GLM_DECLARED_TOOL_NAMES = new Set(
  GLM_NATIVE_WORKFLOW_TOOLS.map((tool) => tool.function.name)
);

function buildCodexNativeGlmTools(): readonly GlmNativeToolDefinition[] {
  const captured = JSON.parse(CODEX_NATIVE_TOOL_DEFINITIONS_JSON) as unknown;
  if (!Array.isArray(captured)) {
    return [];
  }
  return captured.flatMap(convertCapturedToolToGlmTools);
}

function convertCapturedToolToGlmTools(
  tool: unknown
): readonly GlmNativeToolDefinition[] {
  if (!isRecord(tool)) {
    return [];
  }
  if (tool.type === "function") {
    const name = readString(tool.name);
    return name
      ? [
          buildGlmFunctionTool({
            description: readString(tool.description) ?? name,
            name,
            parameters: readParameters(tool.parameters),
          }),
        ]
      : [];
  }
  if (tool.type === "custom" && tool.name === "apply_patch") {
    return [
      buildGlmFunctionTool({
        description: readString(tool.description) ?? "Apply a patch.",
        name: "apply_patch",
        parameters: {
          additionalProperties: false,
          properties: {
            patch: {
              description:
                "Complete apply_patch payload. GLM must pass the freeform patch text in this JSON string because Z.AI tools support function JSON parameters.",
              type: "string",
            },
          },
          required: ["patch"],
          type: "object",
        },
      }),
    ];
  }
  if (tool.type === "namespace") {
    const namespaceName = readString(tool.name);
    const namespaceTools = Array.isArray(tool.tools) ? tool.tools : [];
    if (!namespaceName) {
      return [];
    }
    return namespaceTools.flatMap((namespaceTool) => {
      if (!isRecord(namespaceTool)) {
        return [];
      }
      const childName = readString(namespaceTool.name);
      if (!childName) {
        return [];
      }
      return [
        buildGlmFunctionTool({
          description: [
            `Codex namespace ${namespaceName} tool ${childName}.`,
            readString(namespaceTool.description) ?? "",
          ]
            .filter(Boolean)
            .join(" "),
          name: `${namespaceName}__${childName}`,
          parameters: readParameters(namespaceTool.parameters),
        }),
      ];
    });
  }
  if (tool.type === "tool_search") {
    return [
      buildGlmFunctionTool({
        description: readString(tool.description) ?? "Search available tools.",
        name: "tool_search",
        parameters: readParameters(tool.parameters),
      }),
    ];
  }
  if (tool.type === "web_search") {
    return [
      buildGlmFunctionTool({
        description: "Search the web for current information.",
        name: "web_search",
        parameters: {
          additionalProperties: false,
          properties: {
            query: {
              description: "Search query.",
              type: "string",
            },
            response_length: {
              description: "Desired response length.",
              enum: ["short", "medium", "long"],
              type: "string",
            },
          },
          required: ["query"],
          type: "object",
        },
      }),
    ];
  }
  if (tool.type === "image_generation") {
    return [
      buildGlmFunctionTool({
        description: "Generate or edit a PNG image from a prompt.",
        name: "image_generation",
        parameters: {
          additionalProperties: false,
          properties: {
            prompt: {
              description: "Image generation prompt.",
              type: "string",
            },
          },
          required: ["prompt"],
          type: "object",
        },
      }),
    ];
  }
  return [];
}

function buildGlmFunctionTool(options: {
  readonly description: string;
  readonly name: string;
  readonly parameters: Record<string, unknown>;
}): GlmNativeToolDefinition {
  return {
    function: {
      description: options.description,
      name: options.name,
      parameters: options.parameters,
    },
    type: "function",
  };
}

function readParameters(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : EMPTY_PARAMETERS_SCHEMA;
}

const buildGlmNativeSystemInstruction = (profile: GlmRuntimeProfile): string =>
  [
    CODEX_NATIVE_SYSTEM_INSTRUCTIONS,
    "",
    "# CodeAI Hub GLM Runtime Addendum",
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
    "- The executable GLM tools are provided in the request `tools` array using Z.AI/OpenAI-compatible function-call format.",
    "- The captured Codex-native tool surface is converted into GLM function tools. Namespaced Codex tools are flattened with double underscores, for example `mcp__playwright__browser_click`.",
    "- Do not look for tool definitions in this system message; use the provider-visible function tools.",
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
  if (toolCall.function.name === EXEC_COMMAND_TOOL_NAME) {
    return await executeCommandTool(toolCall, workspacePath);
  }
  if (toolCall.function.name === WORKFLOW_ARTIFACT_TOOL_NAME) {
    return await executeWorkflowArtifactTool(toolCall, workspacePath);
  }
  if (GLM_DECLARED_TOOL_NAMES.has(toolCall.function.name)) {
    return {
      error: `Tool ${toolCall.function.name} is declared in the GLM request, but CodeAI Hub has not wired a local executor for it in the GLM runtime yet.`,
      ok: false,
      tool_call_id: toolCall.id,
    };
  }
  return {
    error: `Unknown tool: ${toolCall.function.name}`,
    ok: false,
  };
};

const executeCommandTool = async (
  toolCall: GlmToolCall,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const args = parseToolArguments(toolCall.function.arguments);
  const command = typeof args.cmd === "string" ? args.cmd.trim() : "";
  if (command.length === 0) {
    return { error: "cmd must be a non-empty string.", ok: false };
  }
  const cwd = resolveCommandWorkingDirectory(args.workdir, workspacePath);
  const timeoutMs = clampNumber(args.yield_time_ms, 250, 300_000, 30_000);
  const outputTokenBudget = clampNumber(
    args.max_output_tokens,
    1000,
    30_000,
    10_000
  );
  const maxOutputChars = Math.max(4000, outputTokenBudget * 4);
  try {
    const result = await execAsync(command, {
      cwd,
      maxBuffer: maxOutputChars,
      shell: typeof args.shell === "string" ? args.shell : process.env.SHELL,
      timeout: timeoutMs,
    });
    return {
      command,
      cwd,
      ok: true,
      stderr: truncateText(result.stderr, maxOutputChars),
      stdout: truncateText(result.stdout, maxOutputChars),
      tool_call_id: toolCall.id,
    };
  } catch (error) {
    const failure = error as Error & {
      readonly code?: number | string;
      readonly killed?: boolean;
      readonly signal?: string;
      readonly stderr?: string;
      readonly stdout?: string;
    };
    return {
      command,
      cwd,
      error: failure.message,
      exitCode: failure.code ?? null,
      ok: false,
      signal: failure.signal ?? null,
      stderr: truncateText(failure.stderr ?? "", maxOutputChars),
      stdout: truncateText(failure.stdout ?? "", maxOutputChars),
      timedOut: failure.killed === true,
      tool_call_id: toolCall.id,
    };
  }
};

const executeWorkflowArtifactTool = async (
  toolCall: GlmToolCall,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
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

const resolveCommandWorkingDirectory = (
  value: unknown,
  workspacePath?: string
): string => {
  const basePath = workspacePath ?? process.cwd();
  if (typeof value !== "string" || value.trim().length === 0) {
    return basePath;
  }
  return path.resolve(basePath, value.trim());
};

const clampNumber = (
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

const truncateText = (value: string, maxLength: number): string =>
  value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength)}\n...[truncated]`;

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
