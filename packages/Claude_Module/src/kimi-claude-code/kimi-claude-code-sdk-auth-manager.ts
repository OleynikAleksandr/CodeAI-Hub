import type { ClaudeSDKAuthProvider } from "../sdk/claude-sdk-manager";
import type { ModuleReporter } from "../types";
import {
  buildKimiClaudeCodeRuntimeProbeProfile,
  type KimiClaudeCodeRuntimeProbeProfile,
  type KimiClaudeCodeRuntimeProbeProfileOptions,
} from "./kimi-claude-code-runtime-profile";

export interface KimiClaudeCodeSDKAuthManagerOptions
  extends KimiClaudeCodeRuntimeProbeProfileOptions {
  readonly reporter?: ModuleReporter;
}

export class KimiClaudeCodeSDKAuthManager implements ClaudeSDKAuthProvider {
  private readonly options: KimiClaudeCodeSDKAuthManagerOptions;
  private profile: KimiClaudeCodeRuntimeProbeProfile | null = null;

  constructor(options: KimiClaudeCodeSDKAuthManagerOptions = {}) {
    this.options = options;
  }

  async ensureSubscriptionAuth(): Promise<void> {
    const profile = await this.resolveProfile();
    if (!profile.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "Kimi-Claude-Code API key was not found. Set CODEAI_KIMI_CLAUDE_CODE_API_KEY, KIMI_API_KEY, or ~/.kimi/config.toml providers.kimi-for-coding.api_key."
      );
    }
    this.options.reporter?.info?.(
      `Kimi-Claude-Code auth ready via ${profile.diagnostics.apiKeySource}`
    );
  }

  async ensureProviderHomeSessionBootstrap(): Promise<void> {
    await this.ensureSubscriptionAuth();
  }

  getAuthEnvironment(): NodeJS.ProcessEnv {
    if (!this.profile) {
      throw new Error(
        "Kimi-Claude-Code auth environment is not initialized. Call ensureSubscriptionAuth first."
      );
    }
    return { ...this.profile.env };
  }

  getDiagnostics(): KimiClaudeCodeRuntimeProbeProfile["diagnostics"] | null {
    return this.profile?.diagnostics ?? null;
  }

  private async resolveProfile(): Promise<KimiClaudeCodeRuntimeProbeProfile> {
    if (!this.profile) {
      this.profile = await buildKimiClaudeCodeRuntimeProbeProfile(this.options);
    }
    return this.profile;
  }
}
