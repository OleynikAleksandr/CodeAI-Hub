import { mkdir } from "node:fs/promises";
import type { ClaudeSDKAuthProvider } from "../sdk/claude-sdk-manager";
import type { ModuleReporter } from "../types";
import {
  buildGlmClaudeCodeRuntimeProbeProfile,
  type GlmClaudeCodeRuntimeProbeProfile,
  type GlmClaudeCodeRuntimeProbeProfileOptions,
  resolveGlmClaudeCodeProjectPath,
} from "./glm-claude-code-runtime-profile";

export interface GlmClaudeCodeSDKAuthManagerOptions
  extends GlmClaudeCodeRuntimeProbeProfileOptions {
  readonly reporter?: ModuleReporter;
}

export class GlmClaudeCodeSDKAuthManager implements ClaudeSDKAuthProvider {
  private readonly options: GlmClaudeCodeSDKAuthManagerOptions;
  private profile: GlmClaudeCodeRuntimeProbeProfile | null = null;

  constructor(options: GlmClaudeCodeSDKAuthManagerOptions = {}) {
    this.options = options;
  }

  async ensureSubscriptionAuth(): Promise<void> {
    const profile = await this.resolveProfile();
    if (!profile.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "GLM-Claude-Code API key was not found. Set CODEAI_GLM_CLAUDE_CODE_API_KEY, GLM_CLAUDE_CODE_API_KEY, ZAI_API_KEY, apiKey in ~/.codeai-hub/providers/glm-claude-code/config.json, or providers.glmClaudeCode.apiKey in workspace Settings."
      );
    }
    this.options.reporter?.info?.(
      `GLM-Claude-Code auth ready via ${profile.diagnostics.apiKeySource}`
    );
  }

  async ensureProviderHomeSessionBootstrap(): Promise<void> {
    const profile = await this.resolveProfile();
    await this.ensureSubscriptionAuth();
    await mkdir(profile.home, { recursive: true });
    await mkdir(resolveGlmClaudeCodeProjectPath({ home: profile.home }), {
      recursive: true,
    });
  }

  getAuthEnvironment(): NodeJS.ProcessEnv {
    if (!this.profile) {
      throw new Error(
        "GLM-Claude-Code auth environment is not initialized. Call ensureSubscriptionAuth first."
      );
    }
    return { ...this.profile.env };
  }

  getDiagnostics(): GlmClaudeCodeRuntimeProbeProfile["diagnostics"] | null {
    return this.profile?.diagnostics ?? null;
  }

  private async resolveProfile(): Promise<GlmClaudeCodeRuntimeProbeProfile> {
    if (!this.profile) {
      this.profile = await buildGlmClaudeCodeRuntimeProbeProfile(this.options);
    }
    return this.profile;
  }
}
