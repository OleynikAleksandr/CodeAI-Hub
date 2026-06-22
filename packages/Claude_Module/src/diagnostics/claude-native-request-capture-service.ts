import type { SDKInstaller } from "../installer/sdk-installer";
import { resolveClaudeProviderProjectDir } from "../sdk/claude-provider-home";
import type { ClaudeSDKAuthProvider } from "../sdk/claude-sdk-manager";
import {
  CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT,
  CODEAI_CLAUDE_WORKFLOW_TOOLS,
} from "../sdk/claude-workflow-system-prompt";
import type { ClaudeStreamMessage, ClaudeWorkspaceOptions } from "../types";

export interface ClaudeNativeRequestCaptureOptions {
  readonly appliedTurnConfig?: ClaudeNativeRequestCaptureAppliedTurnConfig | null;
  readonly captureId: string;
  readonly captureMode?: "managed" | "vanilla" | null;
  readonly certificateEnv: Readonly<Record<string, string>>;
  readonly certificatePath: string;
  readonly probePrompt: string;
  readonly proxyUrl: string;
  readonly recordAppliedInputEnvelope?: (
    envelope: ClaudeNativeRequestCaptureAppliedInputEnvelope
  ) => Promise<void> | void;
  readonly selectedModelId?: string | null;
  readonly workflowPrompt?: string | null;
  readonly workspacePath: string;
}

interface ClaudeNativeRequestCaptureAppliedTurnConfig {
  readonly modelId?: string;
  readonly providerId: string;
  readonly reasoningEffort?: string;
  readonly source: "settings_snapshot" | "switch_request";
  readonly thinkingDisplaySyncEnabled?: boolean;
  readonly thinkingEnabled?: boolean;
}

interface ClaudeNativeRequestCaptureAppliedInputEnvelope {
  readonly allowDangerouslySkipPermissions: boolean | null;
  readonly cwd: string | null;
  readonly hasSystemPrompt: boolean;
  readonly kind: "claude";
  readonly permissionMode: string | null;
  readonly settingSources: readonly string[] | null;
  readonly toolCount: number;
}

interface ClaudeNativeRequestCaptureAuthProvider extends ClaudeSDKAuthProvider {
  ensureProviderHomeSessionBootstrap(options?: {
    readonly executablePath?: string;
    readonly workspacePath?: string;
  }): Promise<void>;
}

interface ClaudeCaptureThinkingOptions {
  readonly effort?: string;
  readonly thinking: {
    readonly display?: "summarized" | "omitted";
    readonly type: "adaptive" | "disabled";
  };
}

type QueryFunction = (payload: {
  readonly options: Record<string, unknown>;
  readonly prompt: string;
}) => AsyncIterableIterator<ClaudeStreamMessage>;

export class ClaudeNativeRequestCaptureService {
  readonly #authManager: ClaudeNativeRequestCaptureAuthProvider;
  readonly #installer: SDKInstaller;
  readonly #workspace: ClaudeWorkspaceOptions;

  constructor(options: {
    readonly authManager: ClaudeNativeRequestCaptureAuthProvider;
    readonly installer: SDKInstaller;
    readonly workspace: ClaudeWorkspaceOptions;
  }) {
    this.#authManager = options.authManager;
    this.#installer = options.installer;
    this.#workspace = options.workspace;
  }

  async captureNativeRequest(
    options: ClaudeNativeRequestCaptureOptions
  ): Promise<void> {
    await this.#installer.ensureInstalled();
    const executablePath = this.#installer.getExecutablePath();
    await this.#authManager.ensureSubscriptionAuth({ executablePath });
    await this.#authManager.ensureProviderHomeSessionBootstrap({
      executablePath,
      workspacePath: options.workspacePath,
    });
    const sdkModule = await this.#installer.loadModule<{
      readonly query: QueryFunction;
    }>();
    const queryOptions = this.buildQueryOptions(options);
    await options.recordAppliedInputEnvelope?.(
      buildAppliedInputEnvelope(queryOptions)
    );
    const iterator = sdkModule.query({
      prompt: resolveCapturePrompt(options),
      options: queryOptions,
    });
    for await (const _message of iterator) {
      // Drain until the capture proxy aborts the diagnostic request.
    }
  }

  private buildQueryOptions(
    options: ClaudeNativeRequestCaptureOptions
  ): Record<string, unknown> {
    const thinkingOptions = resolveThinkingOptions(options.appliedTurnConfig);
    const baseOptions: Record<string, unknown> = {
      cwd: options.workspacePath,
      env: {
        ...this.#authManager.getAuthEnvironment(),
        ...options.certificateEnv,
        ALL_PROXY: options.proxyUrl,
        HTTP_PROXY: options.proxyUrl,
        HTTPS_PROXY: options.proxyUrl,
        NODE_EXTRA_CA_CERTS:
          options.certificateEnv.NODE_EXTRA_CA_CERTS ?? options.certificatePath,
        REQUESTS_CA_BUNDLE:
          options.certificateEnv.REQUESTS_CA_BUNDLE ?? options.certificatePath,
        SSL_CERT_FILE:
          options.certificateEnv.SSL_CERT_FILE ?? options.certificatePath,
      },
      includePartialMessages: false,
      model: resolveModelId(options) ?? this.#workspace.defaultModel,
      pathToClaudeCodeExecutable: this.#installer.getExecutablePath(),
      persistSession: false,
      thinking: thinkingOptions.thinking,
      ...(thinkingOptions.effort ? { effort: thinkingOptions.effort } : {}),
    };
    if (options.captureMode === "vanilla") {
      return baseOptions;
    }
    return {
      ...baseOptions,
      additionalDirectories: [options.workspacePath],
      allowDangerouslySkipPermissions: true,
      permissionMode: "bypassPermissions",
      projectPath: resolveClaudeProviderProjectDir(
        this.#workspace.claudeProjectSlug
      ),
      settingSources: [],
      systemPrompt: CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT,
      tools: [...CODEAI_CLAUDE_WORKFLOW_TOOLS],
    };
  }
}

const resolveModelId = (
  options: ClaudeNativeRequestCaptureOptions
): string | undefined =>
  readNonEmptyString(options.appliedTurnConfig?.modelId) ??
  readNonEmptyString(options.selectedModelId);

const resolveThinkingOptions = (
  appliedTurnConfig?: ClaudeNativeRequestCaptureAppliedTurnConfig | null
): ClaudeCaptureThinkingOptions => {
  if (appliedTurnConfig?.thinkingEnabled) {
    const display: "summarized" | "omitted" =
      appliedTurnConfig.thinkingDisplaySyncEnabled === false
        ? "omitted"
        : "summarized";
    return {
      thinking: { type: "adaptive", display },
      effort: readNonEmptyString(appliedTurnConfig.reasoningEffort) ?? "medium",
    };
  }
  return { thinking: { type: "disabled" } };
};

const readNonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const resolveCapturePrompt = (
  options: ClaudeNativeRequestCaptureOptions
): string => readNonEmptyString(options.workflowPrompt) ?? options.probePrompt;

const buildAppliedInputEnvelope = (
  queryOptions: Record<string, unknown>
): ClaudeNativeRequestCaptureAppliedInputEnvelope => ({
  allowDangerouslySkipPermissions: readBooleanOrNull(
    queryOptions.allowDangerouslySkipPermissions
  ),
  cwd: readStringOrNull(queryOptions.cwd),
  hasSystemPrompt: readNonEmptyString(queryOptions.systemPrompt) !== undefined,
  kind: "claude",
  permissionMode: readStringOrNull(queryOptions.permissionMode),
  settingSources: readStringArrayOrNull(queryOptions.settingSources),
  toolCount: Array.isArray(queryOptions.tools) ? queryOptions.tools.length : 0,
});

const readBooleanOrNull = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

const readStringOrNull = (value: unknown): string | null =>
  readNonEmptyString(value) ?? null;

const readStringArrayOrNull = (value: unknown): readonly string[] | null =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        const item = readNonEmptyString(entry);
        return item ? [item] : [];
      })
    : null;
