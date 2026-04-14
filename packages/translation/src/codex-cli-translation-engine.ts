import { spawn } from "node:child_process";
import { CodexCliPathResolver } from "./codex-cli-path-resolver";
import {
  CodexTranslationRuntimeHomeFacade,
  type CodexTranslationRuntimeOptions,
} from "./codex-translation-runtime-home-facade";
import type {
  TranslationReporter,
  TranslationRequest,
  TranslationResult,
} from "./translation-contract";
import type {
  NormalizedTranslationRequest,
  TranslationEngine,
} from "./translation-engine";

const DEFAULT_REASONING_EFFORT = "low";
const DEFAULT_SANDBOX_MODE = "read-only";
const STRUCTURED_LOCALIZATION_CATEGORY = "localization_bundle";

const buildStructuredLocalizationMarkerInstructions = (): string =>
  "Preserve every marker line that starts with __CODEAI_HUB_LOCALIZATION_ENTRY__ exactly. Translate only the text between each START and END marker. Do not remove, rename, reorder, or merge markers.";

const buildTranslatorInstructions = (request: TranslationRequest): string =>
  [
    "You are a precise translation engine.",
    `Translate the source text from ${request.sourceLanguage} into the language identified by the code ${request.targetLanguage}.`,
    "Preserve Markdown structure, file paths, filenames, code identifiers, provider names, model names, product names, and compact canonical technical labels when they are already written exactly.",
    ...(request.category === STRUCTURED_LOCALIZATION_CATEGORY
      ? [buildStructuredLocalizationMarkerInstructions()]
      : []),
    "Do not add commentary.",
    "Return only the translation.",
  ].join(" ");

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
    request.text,
  ].join("\n");

const createFallbackResult = (
  request: TranslationRequest,
  engineId: string,
  errorCode: string
): TranslationResult => ({
  engine: engineId,
  errorCode,
  finalText: request.text,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "fallback",
  targetLanguage: request.targetLanguage,
  translatedText: null,
});

const createTranslatedResult = (
  request: TranslationRequest,
  engineId: string,
  translatedText: string
): TranslationResult => ({
  engine: engineId,
  finalText: translatedText,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "translated",
  targetLanguage: request.targetLanguage,
  translatedText,
});

const parseTranslatedText = (stdout: string): string | null => {
  for (const line of stdout.split("\n").reverse()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as {
        readonly item?: {
          readonly text?: string;
          readonly type?: string;
        };
        readonly type?: string;
      };
      if (
        parsed.type === "item.completed" &&
        parsed.item?.type === "agent_message" &&
        typeof parsed.item.text === "string"
      ) {
        const translated = parsed.item.text.trim();
        return translated.length > 0 ? translated : null;
      }
    } catch {
      // Ignore non-JSON or diagnostic lines.
    }
  }

  return null;
};

export interface CodexCliTranslationEngineOptions {
  readonly cliPathResolver?: CodexCliPathResolver;
  readonly engineId: string;
  readonly modelId: string;
  readonly reasoningEffort?: string;
  readonly reporter?: TranslationReporter;
  readonly runtimeHomeFacade?: CodexTranslationRuntimeHomeFacade;
  readonly sandboxMode?: string;
}

export class CodexCliTranslationEngine implements TranslationEngine {
  readonly id: string;
  private readonly cliPathResolver: CodexCliPathResolver;
  private readonly modelId: string;
  private readonly reasoningEffort: string;
  private readonly reporter?: TranslationReporter;
  private readonly runtimeHomeFacade: CodexTranslationRuntimeHomeFacade;
  private readonly sandboxMode: string;

  constructor(options: CodexCliTranslationEngineOptions) {
    this.id = options.engineId;
    this.modelId = options.modelId;
    this.reasoningEffort = options.reasoningEffort ?? DEFAULT_REASONING_EFFORT;
    this.reporter = options.reporter;
    this.sandboxMode = options.sandboxMode ?? DEFAULT_SANDBOX_MODE;
    this.cliPathResolver =
      options.cliPathResolver ?? new CodexCliPathResolver();
    this.runtimeHomeFacade =
      options.runtimeHomeFacade ?? new CodexTranslationRuntimeHomeFacade();
  }

  async translate(
    request: NormalizedTranslationRequest
  ): Promise<TranslationResult> {
    const executablePath = this.cliPathResolver.resolveExecutablePath();
    if (!executablePath) {
      this.reporter?.warn?.("Codex translation CLI unavailable", {
        engine: this.id,
      });
      return createFallbackResult(request, this.id, "cli_unavailable");
    }

    const runtimeOptions = {
      modelId: this.modelId,
      modelInstructions: buildTranslatorInstructions(request),
      reasoningEffort: this.reasoningEffort,
      sandboxMode: this.sandboxMode,
    } satisfies CodexTranslationRuntimeOptions;

    let cleanup: (() => Promise<void>) | null = null;
    try {
      const runtime = await this.runtimeHomeFacade.materialize(runtimeOptions);
      cleanup = runtime.cleanup;
      const stdout = await this.runCodexTranslation(executablePath, runtime, {
        prompt: buildPrompt(request),
        timeoutMs: request.timeoutMs,
      });
      const translated = parseTranslatedText(stdout);
      if (!translated) {
        return createFallbackResult(request, this.id, "empty_translation");
      }

      return createTranslatedResult(request, this.id, translated);
    } catch (error) {
      this.reporter?.warn?.("Codex translation failed", {
        engine: this.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return createFallbackResult(request, this.id, "request_failed");
    } finally {
      await cleanup?.();
    }
  }

  private runCodexTranslation(
    executablePath: string,
    runtime: Awaited<
      ReturnType<CodexTranslationRuntimeHomeFacade["materialize"]>
    >,
    options: {
      readonly prompt: string;
      readonly timeoutMs: number;
    }
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const child = spawn(
        executablePath,
        [
          "exec",
          "--skip-git-repo-check",
          "--ephemeral",
          "-C",
          runtime.workspacePath,
          "-m",
          this.modelId,
          "-s",
          this.sandboxMode,
          "--json",
          options.prompt,
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CODEX_HOME: runtime.homePath,
          },
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
      }, options.timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on("close", (code, signal) => {
        clearTimeout(timeout);
        if (signal) {
          reject(
            new Error(
              `Codex translation process terminated by signal ${signal}. stderr=${stderr}`
            )
          );
          return;
        }
        if (code !== 0) {
          reject(
            new Error(
              `Codex translation process failed with code ${code}. stderr=${stderr}`
            )
          );
          return;
        }
        resolve(stdout);
      });
    });
  }
}
