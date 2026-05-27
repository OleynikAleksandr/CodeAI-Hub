import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildCodexReasoningSummaryParams } from "../app-server/codex-reasoning-summary-params";
import {
  CodexAppServerProcess,
  resolveProviderCodexHome,
} from "../app-server/process/codex-app-server-process";
import {
  CODEX_TRANSLATION_PROCESS_PROFILE_KEY,
  type CodexAppServerProcessProfileKey,
} from "../app-server/process/codex-app-server-process-profile";
import type { ModuleReporter } from "../types";
import type { CodexAppServerTranslationRequest } from "./codex-translation-prompt-profile";
import { buildCodexAppServerTranslationPromptProfile } from "./codex-translation-prompt-profile";

const DEFAULT_TURN_TIMEOUT_MS = 35_000;
const TRANSLATION_APPROVAL_POLICY = "never";
const TRANSLATION_SANDBOX = "read-only";

export interface CodexAppServerTranslationServiceRequest
  extends CodexAppServerTranslationRequest {
  readonly timeoutMs?: number;
}

export interface CodexAppServerTranslationServiceResult {
  readonly errorCode?: string;
  readonly finalText: string;
  readonly originalText: string;
  readonly sourceLanguage: string;
  readonly status: "fallback" | "translated";
  readonly targetLanguage: string;
  readonly translatedText: string | null;
}

interface CodexProcessLike {
  onNotification(
    listener: (notification: {
      readonly method: string;
      readonly params: unknown;
    }) => void
  ): () => void;
  request<TResult = unknown>(
    method: string,
    params?: unknown
  ): Promise<TResult>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

type CodexProcessFactory = (options: {
  readonly environment: Readonly<Record<string, string>>;
  readonly processProfileKey: CodexAppServerProcessProfileKey;
  readonly reporter?: ModuleReporter;
}) => CodexProcessLike;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asText = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const createFallbackResult = (
  request: CodexAppServerTranslationServiceRequest,
  errorCode: string
): CodexAppServerTranslationServiceResult => ({
  errorCode,
  finalText: request.text,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "fallback",
  targetLanguage: request.targetLanguage,
  translatedText: null,
});

const createTranslatedResult = (
  request: CodexAppServerTranslationServiceRequest,
  translatedText: string
): CodexAppServerTranslationServiceResult => ({
  finalText: translatedText,
  originalText: request.text,
  sourceLanguage: request.sourceLanguage,
  status: "translated",
  targetLanguage: request.targetLanguage,
  translatedText,
});

const createTimeoutError = (): Error =>
  new Error("Timed out waiting for Codex translation turn completion");

export class CodexAppServerTranslationService {
  readonly #modelId: string;
  readonly #providerHomePath: string;
  readonly #processFactory: CodexProcessFactory;
  readonly #reporter?: ModuleReporter;
  readonly #turnTimeoutMs: number;

  constructor(options: {
    readonly modelId: string;
    readonly providerHomePath?: string;
    readonly processFactory?: CodexProcessFactory;
    readonly reporter?: ModuleReporter;
    readonly turnTimeoutMs?: number;
  }) {
    this.#modelId = options.modelId;
    this.#providerHomePath =
      options.providerHomePath ?? resolveProviderCodexHome();
    this.#processFactory =
      options.processFactory ??
      ((processOptions) => new CodexAppServerProcess(processOptions));
    this.#reporter = options.reporter;
    this.#turnTimeoutMs = options.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS;
  }

  async translate(
    request: CodexAppServerTranslationServiceRequest
  ): Promise<CodexAppServerTranslationServiceResult> {
    const process = this.#processFactory({
      environment: {},
      processProfileKey: CODEX_TRANSLATION_PROCESS_PROFILE_KEY,
      reporter: this.#reporter,
    });
    const workspacePath = await mkdtemp(
      path.join(tmpdir(), "codeai-codex-translation-")
    );
    const turnCollector = this.#createTurnCollector(process, request);
    let completedThreadId: string | null = null;
    try {
      const promptProfile = buildCodexAppServerTranslationPromptProfile({
        modelId: this.#modelId,
        request,
      });
      await process.start();
      const threadId = await this.#startThread(
        process,
        promptProfile,
        workspacePath
      );
      turnCollector.bindThread(threadId);
      await this.#startTurn(process, promptProfile, threadId, workspacePath);
      const translatedText = (await turnCollector.done).trim();
      if (!translatedText) {
        return createFallbackResult(request, "empty_translation");
      }
      completedThreadId = threadId;
      return createTranslatedResult(request, translatedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#reporter?.warn?.(
        `Codex app-server translation failed for ${this.#modelId}: ${message}`
      );
      return createFallbackResult(request, "request_failed");
    } finally {
      turnCollector.unsubscribe();
      await process.stop();
      if (completedThreadId) {
        await this.#discardCompletedTranslationSession(completedThreadId);
      }
      await rm(workspacePath, { force: true, recursive: true });
    }
  }

  async #discardCompletedTranslationSession(threadId: string): Promise<void> {
    const sessionsRoot = path.join(this.#providerHomePath, "sessions");
    const candidates = await this.#findNativeSessionFiles(sessionsRoot);
    await Promise.all(
      candidates
        .filter((filePath) => path.basename(filePath).includes(threadId))
        .map((filePath) => rm(filePath, { force: true }))
    ).catch((error) => {
      this.#reporter?.warn?.(
        `Codex translation session cleanup failed: ${error instanceof Error ? error.message : String(error)}`
      );
    });
  }

  async #findNativeSessionFiles(root: string): Promise<readonly string[]> {
    const entries = await readdir(root, { withFileTypes: true }).catch(
      () => []
    );
    const files: string[] = [];
    for (const entry of entries) {
      const absolutePath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.#findNativeSessionFiles(absolutePath)));
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        files.push(absolutePath);
      }
    }
    return files;
  }

  async #startThread(
    process: CodexProcessLike,
    promptProfile: ReturnType<
      typeof buildCodexAppServerTranslationPromptProfile
    >,
    workspacePath: string
  ): Promise<string> {
    const response = await process.request<Record<string, unknown>>(
      "thread/start",
      {
        approvalPolicy: TRANSLATION_APPROVAL_POLICY,
        baseInstructions: promptProfile.baseInstructions,
        config: promptProfile.threadConfig,
        cwd: workspacePath,
        model: promptProfile.modelId,
        persistExtendedHistory: promptProfile.persistExtendedHistory,
        sandbox: TRANSLATION_SANDBOX,
      }
    );
    const thread = isRecord(response.thread) ? response.thread : null;
    const threadId = asString(thread?.id);
    if (!threadId) {
      throw new Error("codex translation thread/start returned no thread id");
    }
    return threadId;
  }

  async #startTurn(
    process: CodexProcessLike,
    promptProfile: ReturnType<
      typeof buildCodexAppServerTranslationPromptProfile
    >,
    threadId: string,
    workspacePath: string
  ): Promise<void> {
    await process.request("turn/start", {
      cwd: workspacePath,
      effort: promptProfile.effort,
      input: [
        {
          text: promptProfile.userPrompt,
          text_elements: [],
          type: "text",
        },
      ],
      model: promptProfile.modelId,
      threadId,
      ...(promptProfile.omitSummary
        ? {}
        : buildCodexReasoningSummaryParams(
            promptProfile.modelId,
            promptProfile.summary ?? "none"
          )),
    });
  }

  #createTurnCollector(
    process: CodexProcessLike,
    request: CodexAppServerTranslationServiceRequest
  ): {
    bindThread(threadId: string): void;
    readonly done: Promise<string>;
    unsubscribe(): void;
  } {
    let boundThreadId: string | null = null;
    let completedText = "";
    let rejectDone: (error: Error) => void = () => undefined;
    let resolveDone: (value: string) => void = () => undefined;
    const itemTextById = new Map<string, string>();
    const timeout = setTimeout(() => {
      rejectDone(createTimeoutError());
    }, request.timeoutMs ?? this.#turnTimeoutMs);
    const done = new Promise<string>((resolve, reject) => {
      rejectDone = reject;
      resolveDone = resolve;
    }).finally(() => {
      clearTimeout(timeout);
    });
    const unsubscribe = process.onNotification(({ method, params }) => {
      if (!isRecord(params) || asString(params.threadId) !== boundThreadId) {
        return;
      }
      if (method === "item/agentMessage/delta") {
        const itemId = asString(params.itemId);
        const delta = asText(params.delta);
        if (itemId && delta !== null) {
          itemTextById.set(itemId, `${itemTextById.get(itemId) ?? ""}${delta}`);
        }
        return;
      }
      if (method === "item/completed") {
        completedText = this.#resolveCompletedAgentMessage(
          params,
          itemTextById
        );
        return;
      }
      if (method === "turn/completed") {
        resolveDone(completedText);
        return;
      }
      if (method === "error") {
        rejectDone(new Error("Codex translation turn failed"));
      }
    });
    return {
      bindThread(threadId: string) {
        boundThreadId = threadId;
      },
      done,
      unsubscribe,
    };
  }

  #resolveCompletedAgentMessage(
    params: Record<string, unknown>,
    itemTextById: Map<string, string>
  ): string {
    const item = isRecord(params.item) ? params.item : null;
    if (!item || asString(item.type) !== "agentMessage") {
      return "";
    }
    const itemId = asString(item.id);
    const text =
      asText(item.text) ?? (itemId ? (itemTextById.get(itemId) ?? null) : null);
    if (itemId) {
      itemTextById.delete(itemId);
    }
    return text ?? "";
  }
}
