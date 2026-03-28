import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { GeminiClient } from "@google/gemini-cli-core/dist/src/core/client";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { ModuleReporter } from "../types";
import { GeminiSessionSettingsResolver } from "./gemini-session-settings-resolver";
import type { ActiveSession, SessionCreationOptions } from "./types";

const GEMINI_ENV_KEYS_TO_CLEAR = [
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_CLOUD_LOCATION",
  "GOOGLE_API_KEY",
] as const;
const GEMINI_START_CHAT_PATCH_FLAG = "__codeaiHubStartChatPatchApplied";
const GEMINI_LOOP_RECOVERY_PATCH_FLAG = "__codeaiHubLoopRecoveryPatchApplied";

type PatchableGeminiClient = GeminiClient & {
  _recoverFromLoop?: (...args: unknown[]) => unknown;
  [GEMINI_LOOP_RECOVERY_PATCH_FLAG]?: boolean;
  [GEMINI_START_CHAT_PATCH_FLAG]?: boolean;
};

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
    this.monkeyPatchGeminiClient(
      client,
      resolvedSettings.resolvedModel ?? "",
      resolvedSettings.resolvedThinkingLevel ?? "",
      options.reporter
    );

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
    client: PatchableGeminiClient,
    modelId: string,
    level: string,
    reporter?: ModuleReporter
  ): void {
    this.patchGeminiLoopRecovery(client, reporter);
    this.patchGeminiStartChat(client, modelId, level);
  }

  private patchGeminiLoopRecovery(
    client: PatchableGeminiClient,
    reporter?: ModuleReporter
  ): void {
    if (client[GEMINI_LOOP_RECOVERY_PATCH_FLAG]) {
      return;
    }

    const originalRecoverMethod =
      typeof client._recoverFromLoop === "function"
        ? client._recoverFromLoop
        : null;
    if (!originalRecoverMethod) {
      return;
    }

    const recoverSource = String(originalRecoverMethod);
    if (!recoverSource.includes("controllerToAbort?.abort()")) {
      return;
    }

    const originalRecoverFromLoop = originalRecoverMethod.bind(client);
    client[GEMINI_LOOP_RECOVERY_PATCH_FLAG] = true;
    reporter?.warn?.(
      "Patched Gemini loop recovery to avoid abort-driven core crash."
    );
    client._recoverFromLoop = (...args: unknown[]) => {
      const [
        loopResult,
        signal,
        promptId,
        boundedTurns,
        isInvalidStreamRetry,
        displayContent,
      ] = args as [unknown, AbortSignal, string, number, boolean, unknown];
      return originalRecoverFromLoop(
        loopResult,
        signal,
        promptId,
        boundedTurns,
        isInvalidStreamRetry,
        displayContent,
        undefined
      );
    };
  }

  private patchGeminiStartChat(
    client: PatchableGeminiClient,
    modelId: string,
    level: string
  ): void {
    if (
      client[GEMINI_START_CHAT_PATCH_FLAG] ||
      typeof client.startChat !== "function"
    ) {
      return;
    }

    client[GEMINI_START_CHAT_PATCH_FLAG] = true;
    const originalStartChat = client.startChat.bind(client);

    // biome-ignore lint/suspicious/noExplicitAny: overriding library method
    client.startChat = async (...args: any[]) => {
      const chat = await originalStartChat(...args);
      const chatAny = chat as unknown as {
        generationConfig?: {
          thinkingConfig?: {
            includeThoughts: boolean;
            thinkingBudget?: number;
            thinkingLevel?: string;
          };
        };
      };

      if (chatAny.generationConfig) {
        const thinkingConfig = this.resolveThinkingConfig(modelId, level);
        if (thinkingConfig) {
          chatAny.generationConfig.thinkingConfig = thinkingConfig;
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
