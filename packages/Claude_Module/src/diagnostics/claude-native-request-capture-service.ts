import type { SDKAuthManager } from "../auth/sdk-auth-manager";
import type { SDKInstaller } from "../installer/sdk-installer";
import { resolveClaudeProviderProjectDir } from "../sdk/claude-provider-home";
import type { ClaudeStreamMessage, ClaudeWorkspaceOptions } from "../types";

export interface ClaudeNativeRequestCaptureOptions {
  readonly captureId: string;
  readonly certificateEnv: Readonly<Record<string, string>>;
  readonly certificatePath: string;
  readonly probePrompt: string;
  readonly proxyUrl: string;
  readonly workspacePath: string;
}

type QueryFunction = (payload: {
  readonly options: Record<string, unknown>;
  readonly prompt: string;
}) => AsyncIterableIterator<ClaudeStreamMessage>;

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
      prompt: options.probePrompt,
      options: this.buildQueryOptions(options),
    });
    for await (const _message of iterator) {
      // Drain until the capture proxy aborts the diagnostic request.
    }
  }

  private buildQueryOptions(
    options: ClaudeNativeRequestCaptureOptions
  ): Record<string, unknown> {
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
      model: this.#workspace.defaultModel,
      pathToClaudeCodeExecutable: this.#installer.getExecutablePath(),
      permissionMode: "bypassPermissions",
      persistSession: false,
      projectPath: resolveClaudeProviderProjectDir(
        this.#workspace.claudeProjectSlug
      ),
      settingSources: [],
      thinking: { type: "disabled" },
    };
  }
}
