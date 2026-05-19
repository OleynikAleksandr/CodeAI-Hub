import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  buildGlmClaudeCodeRuntimeProbeProfile,
  GLM_CLAUDE_CODE_MODEL_ID,
  type GlmClaudeCodeRuntimeProbeProfile,
  type GlmClaudeCodeRuntimeProbeProfileOptions,
} from "../glm-claude-code/glm-claude-code-runtime-profile";
import type { SDKInstaller } from "../installer/sdk-installer";
import {
  CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT,
  CODEAI_CLAUDE_WORKFLOW_TOOLS,
} from "../sdk/claude-workflow-system-prompt";
import type { ClaudeStreamMessage } from "../types";

const DEFAULT_PROBE_PROMPT = "Reply with exactly: GLM_CLAUDE_CODE_PROBE_OK";
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_CAPTURED_MESSAGES = 12;
const SECRET_PATTERN = /sk-[A-Za-z0-9_-]{8,}/gu;

type QueryFunction = (payload: {
  readonly options: Record<string, unknown>;
  readonly prompt: string;
}) => AsyncIterableIterator<ClaudeStreamMessage>;

export type GlmClaudeCodeProbeStatus = "failed" | "passed";

export type GlmClaudeCodeProbeFailureCategory =
  | "api_key_missing"
  | "auth_rejected"
  | "endpoint_rejected"
  | "runtime_timeout"
  | "sdk_rejected"
  | "tool_loop_rejected"
  | "unknown";

export interface GlmClaudeCodeRuntimeProbeRunnerOptions
  extends GlmClaudeCodeRuntimeProbeProfileOptions {
  readonly installer: SDKInstaller;
  readonly prompt?: string;
  readonly timeoutMs?: number;
  readonly workflowPrompt?: string;
  readonly workspacePath: string;
}

export interface GlmClaudeCodeRuntimeProbeResult {
  readonly assistantText: string | null;
  readonly capturedMessageTypes: readonly string[];
  readonly diagnostics: GlmClaudeCodeRuntimeProbeProfile["diagnostics"] & {
    readonly hasSystemPrompt: boolean;
    readonly promptKind: "short" | "workflow";
    readonly settingSources: readonly string[];
    readonly toolNames: readonly string[];
  };
  readonly error: string | null;
  readonly failureCategory: GlmClaudeCodeProbeFailureCategory | null;
  readonly status: GlmClaudeCodeProbeStatus;
}

export class GlmClaudeCodeRuntimeProbeRunner {
  async run(
    options: GlmClaudeCodeRuntimeProbeRunnerOptions
  ): Promise<GlmClaudeCodeRuntimeProbeResult> {
    const profile = await buildGlmClaudeCodeRuntimeProbeProfile(options);
    const diagnostics = buildDiagnostics(
      profile,
      Boolean(options.workflowPrompt)
    );
    if (!profile.env.ANTHROPIC_API_KEY) {
      return {
        assistantText: null,
        capturedMessageTypes: [],
        diagnostics,
        error: "GLM API key is unavailable.",
        failureCategory: "api_key_missing",
        status: "failed",
      };
    }

    try {
      await options.installer.ensureInstalled();
      await ensureProbeProjectPath(profile.home);
      const sdkModule = await options.installer.loadModule<{
        readonly query: QueryFunction;
      }>();
      return await runQuery({
        diagnostics,
        installer: options.installer,
        prompt:
          options.workflowPrompt ?? options.prompt ?? DEFAULT_PROBE_PROMPT,
        profile,
        query: sdkModule.query,
        timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        workspacePath: options.workspacePath,
      });
    } catch (error) {
      return buildFailureResult(diagnostics, error);
    }
  }
}

const runQuery = async (payload: {
  readonly diagnostics: GlmClaudeCodeRuntimeProbeResult["diagnostics"];
  readonly installer: SDKInstaller;
  readonly profile: GlmClaudeCodeRuntimeProbeProfile;
  readonly prompt: string;
  readonly query: QueryFunction;
  readonly timeoutMs: number;
  readonly workspacePath: string;
}): Promise<GlmClaudeCodeRuntimeProbeResult> => {
  const iterator = payload.query({
    prompt: payload.prompt,
    options: buildQueryOptions(payload),
  });
  const messageTypes: string[] = [];
  const textChunks: string[] = [];

  while (messageTypes.length < MAX_CAPTURED_MESSAGES) {
    const item = await nextWithTimeout(iterator, payload.timeoutMs);
    if (item.done) {
      break;
    }
    messageTypes.push(item.value.type);
    const text = extractText(item.value);
    if (text) {
      textChunks.push(text);
    }
  }

  return {
    assistantText: textChunks.join("").trim() || null,
    capturedMessageTypes: messageTypes,
    diagnostics: payload.diagnostics,
    error: null,
    failureCategory: null,
    status: "passed",
  };
};

const buildQueryOptions = (payload: {
  readonly installer: SDKInstaller;
  readonly profile: GlmClaudeCodeRuntimeProbeProfile;
  readonly workspacePath: string;
}): Record<string, unknown> => ({
  additionalDirectories: [payload.workspacePath],
  allowDangerouslySkipPermissions: true,
  cwd: payload.workspacePath,
  env: payload.profile.env,
  includePartialMessages: true,
  model: GLM_CLAUDE_CODE_MODEL_ID,
  pathToClaudeCodeExecutable: payload.installer.getExecutablePath(),
  permissionMode: "bypassPermissions",
  persistSession: false,
  projectPath: resolveProbeProjectPath(payload.profile.home),
  settingSources: [],
  systemPrompt: CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT,
  tools: [...CODEAI_CLAUDE_WORKFLOW_TOOLS],
});

const nextWithTimeout = async (
  iterator: AsyncIterableIterator<ClaudeStreamMessage>,
  timeoutMs: number
): Promise<IteratorResult<ClaudeStreamMessage>> => {
  let timeout: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      iterator.next(),
      new Promise<IteratorResult<ClaudeStreamMessage>>((_, reject) => {
        timeout = setTimeout(() => {
          reject(
            new Error(`GLM-Claude-Code probe timed out after ${timeoutMs}ms.`)
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const buildDiagnostics = (
  profile: GlmClaudeCodeRuntimeProbeProfile,
  workflowPrompt: boolean
): GlmClaudeCodeRuntimeProbeResult["diagnostics"] => ({
  ...profile.diagnostics,
  hasSystemPrompt: true,
  promptKind: workflowPrompt ? "workflow" : "short",
  settingSources: [],
  toolNames: [...CODEAI_CLAUDE_WORKFLOW_TOOLS],
});

const buildFailureResult = (
  diagnostics: GlmClaudeCodeRuntimeProbeResult["diagnostics"],
  error: unknown
): GlmClaudeCodeRuntimeProbeResult => {
  const message = sanitizeError(error);
  return {
    assistantText: null,
    capturedMessageTypes: [],
    diagnostics,
    error: message,
    failureCategory: categorizeFailure(message),
    status: "failed",
  };
};

const categorizeFailure = (
  message: string
): GlmClaudeCodeProbeFailureCategory => {
  const lower = message.toLowerCase();
  if (lower.includes("api key") || lower.includes("anthropic_api_key")) {
    return "auth_rejected";
  }
  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden")
  ) {
    return "auth_rejected";
  }
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "runtime_timeout";
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return "endpoint_rejected";
  }
  if (lower.includes("tool") && lower.includes("schema")) {
    return "tool_loop_rejected";
  }
  if (lower.includes("claude") || lower.includes("sdk")) {
    return "sdk_rejected";
  }
  return "unknown";
};

const sanitizeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(SECRET_PATTERN, "<redacted>");
};

const ensureProbeProjectPath = async (home: string): Promise<void> => {
  await mkdir(resolveProbeProjectPath(home), { recursive: true });
};

const resolveProbeProjectPath = (home: string): string =>
  path.join(home, ".claude", "projects", "glm-claude-code-probe");

const extractText = (message: ClaudeStreamMessage): string | null => {
  const content = message.message?.content ?? message.content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const chunks = content.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.text !== "string") {
      return [];
    }
    return [entry.text];
  });
  return chunks.join("");
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
