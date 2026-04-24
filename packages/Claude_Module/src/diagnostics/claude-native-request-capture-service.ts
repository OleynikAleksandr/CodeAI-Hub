import type { SDKAuthManager } from "../auth/sdk-auth-manager";
import type { SDKInstaller } from "../installer/sdk-installer";
import { resolveClaudeProviderProjectDir } from "../sdk/claude-provider-home";
import type { ClaudeStreamMessage, ClaudeWorkspaceOptions } from "../types";

export interface ClaudeNativeRequestCaptureOptions {
  readonly appliedTurnConfig?: ClaudeNativeRequestCaptureAppliedTurnConfig | null;
  readonly captureId: string;
  readonly certificateEnv: Readonly<Record<string, string>>;
  readonly certificatePath: string;
  readonly probePrompt: string;
  readonly proxyUrl: string;
  readonly selectedModelId?: string | null;
  readonly workflowPrompt?: string | null;
  readonly workspacePath: string;
}

interface ClaudeNativeRequestCaptureAppliedTurnConfig {
  readonly modelId?: string;
  readonly providerId: string;
  readonly reasoningEffort?: string;
  readonly source: "settings_snapshot" | "switch_request";
  readonly thinkingEnabled?: boolean;
}

interface ClaudeCaptureThinkingOptions {
  readonly effort?: string;
  readonly thinking: {
    readonly display?: "summarized";
    readonly type: "adaptive" | "disabled";
  };
}

type QueryFunction = (payload: {
  readonly options: Record<string, unknown>;
  readonly prompt: string;
}) => AsyncIterableIterator<ClaudeStreamMessage>;

const CLAUDE_CODE_SYSTEM_PROMPT_PRESET = {
  preset: "claude_code",
  type: "preset",
} as const;

export class ClaudeNativeRequestCaptureService {
  readonly #authManager: SDKAuthManager;
  readonly #installer: SDKInstaller;
  readonly #workspace: ClaudeWorkspaceOptions;

  constructor(options: {
    readonly authManager: SDKAuthManager;
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
    await this.#authManager.ensureSubscriptionAuth();
    await this.#authManager.ensureProviderHomeSessionBootstrap({
      workspacePath: options.workspacePath,
    });
    const sdkModule = await this.#installer.loadModule<{
      readonly query: QueryFunction;
    }>();
    const iterator = sdkModule.query({
      prompt: resolveCapturePrompt(options),
      options: this.buildQueryOptions(options),
    });
    for await (const _message of iterator) {
      // Drain until the capture proxy aborts the diagnostic request.
    }
  }

  private buildQueryOptions(
    options: ClaudeNativeRequestCaptureOptions
  ): Record<string, unknown> {
    const thinkingOptions = resolveThinkingOptions(options.appliedTurnConfig);
    return {
      additionalDirectories: [options.workspacePath],
      allowDangerouslySkipPermissions: true,
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
      permissionMode: "bypassPermissions",
      persistSession: false,
      projectPath: resolveClaudeProviderProjectDir(
        this.#workspace.claudeProjectSlug
      ),
      settingSources: [],
      systemPrompt: CLAUDE_CODE_SYSTEM_PROMPT_PRESET,
      thinking: thinkingOptions.thinking,
      ...(thinkingOptions.effort ? { effort: thinkingOptions.effort } : {}),
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
    return {
      thinking: { type: "adaptive", display: "summarized" },
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
