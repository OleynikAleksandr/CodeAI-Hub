import { mkdir } from "node:fs/promises";
import type { TranslationRequest } from "@codeai-hub/translation";
import type { SDKAuthManager } from "../auth/sdk-auth-manager";
import type { SDKInstaller } from "../installer/sdk-installer";
import {
  resolveClaudeProviderHome,
  resolveClaudeProviderProjectDir,
} from "../sdk/claude-provider-home";
import type { ClaudeStreamMessage, ModuleReporter } from "../types";
import { buildClaudeHaikuTranslatorInstruction } from "./claude-haiku-translator-instruction";

export const CLAUDE_HAIKU_TRANSLATION_ENGINE_ID = "anthropic-claude-haiku-4-5";
export const CLAUDE_HAIKU_TRANSLATION_MODEL_ID = "claude-haiku-4-5-20251001";
export const CLAUDE_HAIKU_TRANSLATION_PROJECT_SLUG =
  "translation-runtime-haiku";
export const CLAUDE_HAIKU_TRANSLATION_PROVIDER_ID = "claude";

const HAIKU_TRANSLATION_MAX_TURNS = 1;
const DEFAULT_TRANSLATION_TIMEOUT_MS = 30_000;
const STRUCTURED_LOCALIZATION_CATEGORY = "localization_bundle";
const PROMPT_TRIGGER_LITERAL_MASKS = [
  {
    literal: "Ultrathink",
    placeholder: "__CODEAI_HUB_LITERAL_ULTRATHINK__",
  },
] as const;

const maskPromptTriggerLiterals = (text: string): string => {
  let maskedText = text;
  for (const mask of PROMPT_TRIGGER_LITERAL_MASKS) {
    maskedText = maskedText.split(mask.literal).join(mask.placeholder);
  }
  return maskedText;
};

const restorePromptTriggerLiterals = (text: string): string => {
  let restoredText = text;
  for (const mask of PROMPT_TRIGGER_LITERAL_MASKS) {
    restoredText = restoredText.split(mask.placeholder).join(mask.literal);
  }
  return restoredText;
};

export type ClaudeHaikuTranslationQueryFunction = (payload: {
  readonly prompt: string;
  readonly options: Record<string, unknown>;
}) => AsyncIterableIterator<ClaudeStreamMessage> & {
  interrupt?: () => Promise<void>;
};

export interface ClaudeHaikuTranslationServiceOptions {
  readonly authManager: SDKAuthManager;
  readonly installer: SDKInstaller;
  readonly queryLoader?: () => Promise<{
    readonly query: ClaudeHaikuTranslationQueryFunction;
  }>;
  readonly reporter?: ModuleReporter;
}

export interface ClaudeHaikuTranslationServiceResult {
  readonly errorCode?: string;
  readonly text: string | null;
}

interface ClaudeHaikuQueryOptionsPayload {
  readonly cwd: string;
  readonly systemPrompt: string;
}

const buildPrompt = (request: TranslationRequest): string =>
  [
    `Translate the source text into ${request.targetLanguage}.`,
    ...(request.category === STRUCTURED_LOCALIZATION_CATEGORY
      ? [
          "Preserve all __CODEAI_HUB_LOCALIZATION_ENTRY__ marker lines exactly and keep the same order.",
        ]
      : []),
    "Return only the translation.",
    "",
    "Source text:",
    maskPromptTriggerLiterals(request.text),
  ].join("\n");

const resolveTranslationRuntimeCwd = (): string =>
  resolveClaudeProviderProjectDir(CLAUDE_HAIKU_TRANSLATION_PROJECT_SLUG);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractAssistantText = (content: unknown): string | null => {
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const parts: string[] = [];
  for (const block of content) {
    if (!isRecord(block)) {
      continue;
    }
    if (block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  const combined = parts.join("").trim();
  return combined.length > 0 ? combined : null;
};

const extractResultText = (message: ClaudeStreamMessage): string | null => {
  if (typeof message.result === "string") {
    const trimmed = message.result.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (isRecord(message.result)) {
    const nested = (message.result as { readonly text?: unknown }).text;
    if (typeof nested === "string") {
      const trimmedNested = nested.trim();
      return trimmedNested.length > 0 ? trimmedNested : null;
    }
  }
  return null;
};

interface ClaudeHaikuTextAccumulator {
  assistantText: string | null;
  resultText: string | null;
}

interface ClaudeHaikuCancellation {
  timedOut: boolean;
}

const applyAssistantDelta = (
  accumulator: ClaudeHaikuTextAccumulator,
  message: ClaudeStreamMessage
): void => {
  if (!isRecord(message.message)) {
    return;
  }
  const extracted = extractAssistantText(message.message.content);
  if (!extracted) {
    return;
  }
  accumulator.assistantText = accumulator.assistantText
    ? `${accumulator.assistantText}${extracted}`
    : extracted;
};

const applyResultDelta = (
  accumulator: ClaudeHaikuTextAccumulator,
  message: ClaudeStreamMessage
): void => {
  const extracted = extractResultText(message);
  if (extracted) {
    accumulator.resultText = extracted;
  }
};

const consumeHaikuStream = async (
  iterator: AsyncIterableIterator<ClaudeStreamMessage>,
  accumulator: ClaudeHaikuTextAccumulator,
  cancellation: ClaudeHaikuCancellation
): Promise<void> => {
  for await (const message of iterator) {
    if (cancellation.timedOut) {
      return;
    }
    if (message.type === "assistant") {
      applyAssistantDelta(accumulator, message);
      continue;
    }
    if (message.type === "result") {
      applyResultDelta(accumulator, message);
    }
  }
};

const pickTranslatedText = (
  accumulator: ClaudeHaikuTextAccumulator
): string | null => {
  const preferred = accumulator.resultText ?? accumulator.assistantText;
  return preferred ? preferred.trim() : null;
};

export class ClaudeHaikuTranslationService {
  private queryFunction: ClaudeHaikuTranslationQueryFunction | null = null;
  private initialized = false;
  private readonly options: ClaudeHaikuTranslationServiceOptions;

  constructor(options: ClaudeHaikuTranslationServiceOptions) {
    this.options = options;
  }

  async translate(
    request: TranslationRequest,
    translateOptions?: { readonly timeoutMs?: number }
  ): Promise<ClaudeHaikuTranslationServiceResult> {
    try {
      await this.initialize();
      const workspaceCwd = resolveTranslationRuntimeCwd();
      await mkdir(workspaceCwd, { recursive: true });
      const executablePath = this.options.installer.getExecutablePath();
      await this.options.authManager.ensureProviderHomeSessionBootstrap({
        executablePath,
        workspacePath: resolveClaudeProviderHome(),
      });
      const systemPrompt = buildClaudeHaikuTranslatorInstruction(request);
      const queryOptions = this.buildQueryOptions({
        cwd: workspaceCwd,
        systemPrompt,
      });
      if (!this.queryFunction) {
        return { errorCode: "sdk_not_loaded", text: null };
      }
      const iterator = this.queryFunction({
        options: queryOptions,
        prompt: buildPrompt(request),
      });
      const timeoutMs =
        translateOptions?.timeoutMs ?? DEFAULT_TRANSLATION_TIMEOUT_MS;
      const translated = await this.collectTranslatedText(iterator, timeoutMs);
      if (!translated) {
        return { errorCode: "empty_translation", text: null };
      }
      return { text: restorePromptTriggerLiterals(translated) };
    } catch (error) {
      this.options.reporter?.warn?.(
        `Claude Haiku translation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return { errorCode: "request_failed", text: null };
    }
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.options.installer.ensureInstalled();
    await this.options.authManager.ensureSubscriptionAuth({
      executablePath: this.options.installer.getExecutablePath(),
    });
    const loaded = this.options.queryLoader
      ? await this.options.queryLoader()
      : await this.options.installer.loadModule<{
          readonly query: ClaudeHaikuTranslationQueryFunction;
        }>();
    this.queryFunction = loaded.query;
    this.initialized = true;
  }

  private buildQueryOptions(
    payload: ClaudeHaikuQueryOptionsPayload
  ): Record<string, unknown> {
    return {
      additionalDirectories: [payload.cwd],
      allowDangerouslySkipPermissions: true,
      cwd: payload.cwd,
      env: this.options.authManager.getAuthEnvironment(),
      includePartialMessages: false,
      maxTurns: HAIKU_TRANSLATION_MAX_TURNS,
      model: CLAUDE_HAIKU_TRANSLATION_MODEL_ID,
      pathToClaudeCodeExecutable: this.options.installer.getExecutablePath(),
      permissionMode: "bypassPermissions",
      persistSession: true,
      projectPath: resolveClaudeProviderProjectDir(
        CLAUDE_HAIKU_TRANSLATION_PROJECT_SLUG
      ),
      settings: {
        alwaysThinkingEnabled: false,
      },
      settingSources: [],
      systemPrompt: payload.systemPrompt,
      thinking: { type: "disabled" },
      tools: [],
    };
  }

  private async collectTranslatedText(
    iterator: AsyncIterableIterator<ClaudeStreamMessage> & {
      readonly interrupt?: () => Promise<void>;
    },
    timeoutMs: number
  ): Promise<string | null> {
    const accumulator: ClaudeHaikuTextAccumulator = {
      assistantText: null,
      resultText: null,
    };
    const cancellation: ClaudeHaikuCancellation = { timedOut: false };
    const timer = setTimeout(() => {
      cancellation.timedOut = true;
      iterator.interrupt?.().catch(() => {
        // best-effort interrupt
      });
    }, timeoutMs);
    try {
      await consumeHaikuStream(iterator, accumulator, cancellation);
    } finally {
      clearTimeout(timer);
    }
    return cancellation.timedOut ? null : pickTranslatedText(accumulator);
  }
}
