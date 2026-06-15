import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  bootstrapGeminiProviderHomeFromLegacyAuth,
  resolveGeminiProviderGeminiDir,
} from "../runtime/cli-bridge-provider-home";
import type {
  GeminiCliModules,
  GeminiConversationRecord,
} from "../runtime/cli-types";
import type { ModuleReporter } from "../types";
import { GeminiSessionSettingsResolver } from "./gemini-session-settings-resolver";
import type {
  ActiveSession,
  GeminiRuntimeTurnConfig,
  SessionCreationOptions,
} from "./types";

const GEMINI_ENV_KEYS_TO_CLEAR = [
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_CLOUD_LOCATION",
  "GOOGLE_API_KEY",
] as const;
const GEMINI_START_CHAT_PATCH_FLAG = "__codeaiHubStartChatPatchApplied";
const GEMINI_LOOP_RECOVERY_PATCH_FLAG = "__codeaiHubLoopRecoveryPatchApplied";

interface PatchableGeminiClient {
  _recoverFromLoop?: (...args: unknown[]) => unknown;
  startChat?: (...args: unknown[]) => Promise<unknown>;
  [GEMINI_LOOP_RECOVERY_PATCH_FLAG]?: boolean;
  [GEMINI_START_CHAT_PATCH_FLAG]?: boolean;
}

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
    const providerHomeBootstrap = await this.bootstrapProviderHomeAuth(options);
    const resolvedSettings = this.settingsResolver.resolve(
      options,
      requestedResumeSessionId
    );
    this.assertAuthAvailable({
      authAvailable: providerHomeBootstrap.authAvailable,
      authType: resolvedSettings.authType,
      providerGeminiDir: providerHomeBootstrap.providerGeminiDir,
    });

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
    const runtimeTurnConfig: GeminiRuntimeTurnConfig = {
      modelId: resolvedSettings.resolvedModel,
      thinkingLevel: resolvedSettings.resolvedThinkingLevel,
    };
    this.monkeyPatchGeminiClient(
      client as unknown as PatchableGeminiClient,
      runtimeTurnConfig,
      options.reporter
    );

    if (requestedResumeSessionId) {
      await this.hydrateResumedChat(
        config,
        client as unknown as PatchableGeminiClient,
        requestedResumeSessionId,
        options.reporter
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
        runtimeTurnConfig,
        reporter: options.reporter,
      },
    };
  }

  private monkeyPatchGeminiClient(
    client: PatchableGeminiClient,
    runtimeTurnConfig: GeminiRuntimeTurnConfig,
    reporter?: ModuleReporter
  ): void {
    this.patchGeminiLoopRecovery(client, reporter);
    this.patchGeminiStartChat(client, runtimeTurnConfig);
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
    runtimeTurnConfig: GeminiRuntimeTurnConfig
  ): void {
    if (
      client[GEMINI_START_CHAT_PATCH_FLAG] ||
      typeof client.startChat !== "function"
    ) {
      return;
    }

    client[GEMINI_START_CHAT_PATCH_FLAG] = true;
    const originalStartChat = client.startChat.bind(client);

    client.startChat = async (...args: unknown[]) => {
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
        const thinkingConfig = this.resolveThinkingConfig(
          runtimeTurnConfig.modelId ?? "",
          runtimeTurnConfig.thinkingLevel ?? ""
        );
        if (thinkingConfig) {
          chatAny.generationConfig.thinkingConfig = thinkingConfig;
        } else {
          chatAny.generationConfig.thinkingConfig = undefined;
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

  private async bootstrapProviderHomeAuth(options: SessionCreationOptions) {
    const providerGeminiDir = resolveGeminiProviderGeminiDir({
      ...process.env,
      GEMINI_WORKSPACE_PATH: options.workspacePath,
    });
    const result = await bootstrapGeminiProviderHomeFromLegacyAuth({
      providerGeminiDir,
    });
    if (result.copiedFiles.length > 0) {
      options.reporter?.info?.("Gemini provider home auth bootstrapped", {
        copiedFiles: result.copiedFiles,
        providerGeminiDir: result.providerGeminiDir,
      });
    }
    return result;
  }

  private assertAuthAvailable(options: {
    readonly authAvailable: boolean;
    readonly authType: unknown;
    readonly providerGeminiDir: string;
  }): void {
    const loginWithGoogle =
      this.modules.contentGenerator.AuthType.LOGIN_WITH_GOOGLE;
    if (options.authType !== loginWithGoogle || options.authAvailable) {
      return;
    }
    throw new Error(
      `Gemini login auth was not found in workspace provider home ${options.providerGeminiDir}. Run Gemini CLI login or keep ~/.gemini/oauth_creds.json available, then restart Core.`
    );
  }

  private async hydrateResumedChat(
    config: Awaited<ReturnType<GeminiCliModules["config"]["loadCliConfig"]>>,
    client: PatchableGeminiClient,
    resumeSessionId: string,
    reporter?: ModuleReporter
  ): Promise<void> {
    const convert = this.modules.sessionUtils?.convertSessionToClientHistory;
    if (!convert) {
      reporter?.warn?.(
        "Gemini convertSessionToClientHistory unavailable; continuing without resume hydration",
        { resumeSessionId }
      );
      return;
    }

    const storage = (
      config as unknown as { storage?: { getProjectTempDir?: () => string } }
    ).storage;
    const projectTempDir = storage?.getProjectTempDir?.();
    if (!projectTempDir) {
      reporter?.warn?.(
        "Gemini project temp dir unavailable; continuing without resume hydration",
        { resumeSessionId }
      );
      return;
    }

    const chatsDir = path.join(projectTempDir, "chats");
    let loaded: {
      sessionPath: string;
      conversation: GeminiConversationRecord;
    } | null;
    try {
      loaded = await this.findChatFileForSession(chatsDir, resumeSessionId);
    } catch (error) {
      reporter?.warn?.(
        "Gemini resume hydration failed while scanning chat files",
        {
          resumeSessionId,
          chatsDir,
          error: error instanceof Error ? error.message : String(error),
        }
      );
      return;
    }

    if (!loaded) {
      reporter?.warn?.(
        "Gemini chat file for resume session not found; continuing without prior history",
        { resumeSessionId, chatsDir }
      );
      return;
    }

    try {
      const { sessionPath, conversation } = loaded;
      (
        config as unknown as { setSessionId: (id: string) => void }
      ).setSessionId(conversation.sessionId);
      const history = convert(conversation.messages);
      const resumableClient = client as unknown as {
        resumeChat?: (
          history: unknown,
          resumedSessionData: {
            readonly conversation: GeminiConversationRecord;
            readonly filePath: string;
          }
        ) => Promise<void>;
      };
      if (typeof resumableClient.resumeChat !== "function") {
        reporter?.warn?.(
          "Gemini client.resumeChat unavailable; continuing without resume hydration",
          { resumeSessionId }
        );
        return;
      }
      await resumableClient.resumeChat(history, {
        conversation,
        filePath: sessionPath,
      });
      reporter?.info?.("Gemini resume hydration complete", {
        resumeSessionId,
        messageCount: conversation.messages.length,
        sessionPath,
      });
    } catch (error) {
      reporter?.warn?.("Gemini resume hydration failed; continuing fresh", {
        resumeSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async findChatFileForSession(
    chatsDir: string,
    resumeSessionId: string
  ): Promise<{
    sessionPath: string;
    conversation: GeminiConversationRecord;
  } | null> {
    const shortId = resumeSessionId.slice(0, 8);
    let entries: string[];
    try {
      entries = await fs.readdir(chatsDir);
    } catch {
      return null;
    }
    const candidates = entries.filter(
      (name) => name.startsWith("session-") && name.endsWith(`-${shortId}.json`)
    );
    let best: {
      sessionPath: string;
      conversation: GeminiConversationRecord;
      messageCount: number;
    } | null = null;
    for (const name of candidates) {
      const sessionPath = path.join(chatsDir, name);
      try {
        const raw = await fs.readFile(sessionPath, "utf8");
        const parsed = JSON.parse(raw) as GeminiConversationRecord | null;
        if (!parsed || parsed.sessionId !== resumeSessionId) {
          continue;
        }
        const messageCount = Array.isArray(parsed.messages)
          ? parsed.messages.length
          : 0;
        if (!best || messageCount > best.messageCount) {
          best = { sessionPath, conversation: parsed, messageCount };
        }
      } catch {
        // Skip malformed files; we only need one valid match.
      }
    }
    if (!best) {
      return null;
    }
    return { sessionPath: best.sessionPath, conversation: best.conversation };
  }
}
