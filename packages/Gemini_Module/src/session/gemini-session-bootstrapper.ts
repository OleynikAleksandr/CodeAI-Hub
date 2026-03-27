import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { GeminiClient } from "@google/gemini-cli-core/dist/src/core/client";
import type { GeminiCliModules } from "../runtime/cli-types";
import { GeminiSessionSettingsResolver } from "./gemini-session-settings-resolver";
import type { ActiveSession, SessionCreationOptions } from "./types";

const GEMINI_ENV_KEYS_TO_CLEAR = [
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_CLOUD_LOCATION",
  "GOOGLE_API_KEY",
] as const;

interface GeminiSessionBootstrapResult {
  readonly providerSessionId: string | null;
  readonly requestedSessionId: string;
  readonly session: ActiveSession;
}

export class GeminiSessionBootstrapper {
  private readonly modules: GeminiCliModules;
  private readonly settingsResolver: GeminiSessionSettingsResolver;

  constructor(modules: GeminiCliModules) {
    this.modules = modules;
    this.settingsResolver = new GeminiSessionSettingsResolver(modules);
    this.sanitizeEnvironment();
  }

  async bootstrap(
    options: SessionCreationOptions
  ): Promise<GeminiSessionBootstrapResult> {
    const requestedResumeSessionId =
      typeof options.resumeSessionId === "string" &&
      options.resumeSessionId.trim().length > 0
        ? options.resumeSessionId.trim()
        : undefined;
    const requestedSessionId = requestedResumeSessionId ?? randomUUID();
    const eventEmitter = new EventEmitter();
    const resolvedSettings = this.settingsResolver.resolve(
      options,
      requestedResumeSessionId
    );

    const loadCliConfig = this.modules.config
      .loadCliConfig as typeof this.modules.config.loadCliConfig;
    const config = await loadCliConfig(
      resolvedSettings.settings.merged,
      requestedSessionId,
      resolvedSettings.argv,
      options.workspacePath
    );

    try {
      await config.refreshAuth(resolvedSettings.authType);
    } catch (error) {
      options.reporter?.error?.("Gemini authentication failed", error);
      throw error;
    }

    if (resolvedSettings.resolvedModel) {
      config.setModel(resolvedSettings.resolvedModel);
    }

    await config.initialize();
    const client = config.getGeminiClient();
    if (resolvedSettings.resolvedThinkingLevel) {
      this.monkeyPatchGeminiClient(
        client,
        resolvedSettings.resolvedModel ?? "",
        resolvedSettings.resolvedThinkingLevel
      );
    }

    return {
      providerSessionId: config.getSessionId() ?? null,
      requestedSessionId,
      session: {
        sessionId: requestedSessionId,
        createdAt: Date.now(),
        eventEmitter,
        config,
        client,
        workspacePath: options.workspacePath,
        contextWindowTokenLimit: resolvedSettings.contextWindowTokenLimit,
        status: "idle",
        abortController: null,
        reporter: options.reporter,
        logger: options.logger ?? undefined,
      },
    };
  }

  private monkeyPatchGeminiClient(
    // biome-ignore lint/suspicious/noExplicitAny: library client typing is not exposed here
    client: GeminiClient | any,
    modelId: string,
    level: string
  ): void {
    if (!client || typeof client.startChat !== "function") {
      return;
    }

    const originalStartChat = client.startChat.bind(client);

    // biome-ignore lint/suspicious/noExplicitAny: overriding library method
    client.startChat = async (...args: any[]) => {
      const chat = await originalStartChat(...args);

      if (chat?.generationConfig) {
        const thinkingConfig = this.resolveThinkingConfig(modelId, level);
        if (thinkingConfig) {
          chat.generationConfig.thinkingConfig = thinkingConfig;
        }
      }
      return chat;
    };
  }

  private resolveThinkingConfig(
    modelId: string,
    level: string
  ):
    | {
        includeThoughts: boolean;
        thinkingBudget?: number;
        thinkingLevel?: string;
      }
    | undefined {
    if (modelId.startsWith("gemini-3") && level && level !== "off") {
      return {
        includeThoughts: true,
        thinkingLevel: level,
      };
    }

    return;
  }

  private sanitizeEnvironment(): void {
    for (const key of GEMINI_ENV_KEYS_TO_CLEAR) {
      if (key in process.env) {
        delete process.env[key];
      }
    }
  }
}
