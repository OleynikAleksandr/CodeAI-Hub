import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { CodexAppServerProcess } from "../app-server/process/codex-app-server-process";
import type {
  CodexReasoningEffort,
  CodexReasoningSummaryMode,
  CodexWorkspaceOptions,
  ModuleReporter,
} from "../types";

const DIAGNOSTIC_TURN_TIMEOUT_MS = 35_000;
const DEFAULT_REASONING_SUMMARY: CodexReasoningSummaryMode = "detailed";
const DEFAULT_REASONING_SUMMARY_ENABLED = true;
const DEFAULT_SETTINGS_PATH = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);

export interface CodexNativeRequestCaptureOptions {
  readonly appliedTurnConfig?: CodexNativeRequestCaptureAppliedTurnConfig | null;
  readonly captureId: string;
  readonly certificateEnv: Readonly<Record<string, string>>;
  readonly certificatePath: string;
  readonly probePrompt: string;
  readonly proxyUrl: string;
  readonly recordDiagnosticContext?: (record: {
    readonly kind: string;
    readonly payload: unknown;
  }) => Promise<void> | void;
  readonly selectedModelId?: string | null;
  readonly workflowPrompt?: string | null;
  readonly workspacePath: string;
}

interface CodexNativeRequestCaptureAppliedTurnConfig {
  readonly modelId?: string;
  readonly providerId: string;
  readonly reasoningEffort?: string;
  readonly source: "settings_snapshot" | "switch_request";
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
  readonly reporter?: ModuleReporter;
}) => CodexProcessLike;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const resolveSettingsPath = (): string =>
  asString(process.env.CODEX_SETTINGS_PATH) ??
  asString(process.env.CLAUDE_SETTINGS_PATH) ??
  DEFAULT_SETTINGS_PATH;

const resolveReasoningSummaryEnabled = (): boolean => {
  try {
    const parsed = JSON.parse(
      readFileSync(resolveSettingsPath(), "utf8")
    ) as unknown;
    if (!(isRecord(parsed) && isRecord(parsed.providers))) {
      return DEFAULT_REASONING_SUMMARY_ENABLED;
    }
    const codex = parsed.providers.codex;
    if (!isRecord(codex)) {
      return DEFAULT_REASONING_SUMMARY_ENABLED;
    }
    if (typeof codex.reasoningSummaryEnabled === "boolean") {
      return codex.reasoningSummaryEnabled;
    }
    if (typeof codex.thinkingDisplaySyncEnabled === "boolean") {
      return codex.thinkingDisplaySyncEnabled;
    }
    return DEFAULT_REASONING_SUMMARY_ENABLED;
  } catch {
    return DEFAULT_REASONING_SUMMARY_ENABLED;
  }
};

const resolveTurnReasoningSummaryMode = (): CodexReasoningSummaryMode =>
  resolveReasoningSummaryEnabled() ? DEFAULT_REASONING_SUMMARY : "none";

const createTimeoutError = (): Error =>
  new Error("Timed out waiting for diagnostic Codex turn completion");

export class CodexNativeRequestCaptureService {
  readonly #processFactory: CodexProcessFactory;
  readonly #reporter?: ModuleReporter;
  readonly #resolveReasoningSummaryMode: () => CodexReasoningSummaryMode;
  readonly #turnTimeoutMs: number;
  readonly #workspace: CodexWorkspaceOptions;

  constructor(options: {
    readonly processFactory?: CodexProcessFactory;
    readonly reporter?: ModuleReporter;
    readonly resolveReasoningSummaryMode?: () => CodexReasoningSummaryMode;
    readonly turnTimeoutMs?: number;
    readonly workspace: CodexWorkspaceOptions;
  }) {
    this.#processFactory =
      options.processFactory ??
      ((processOptions) => new CodexAppServerProcess(processOptions));
    this.#reporter = options.reporter;
    this.#resolveReasoningSummaryMode =
      options.resolveReasoningSummaryMode ?? resolveTurnReasoningSummaryMode;
    this.#turnTimeoutMs = options.turnTimeoutMs ?? DIAGNOSTIC_TURN_TIMEOUT_MS;
    this.#workspace = options.workspace;
  }

  async captureNativeRequest(
    options: CodexNativeRequestCaptureOptions
  ): Promise<void> {
    const process = this.#processFactory({
      environment: this.#buildEnvironment(options),
      reporter: this.#reporter,
    });
    const turnCompletion = this.#waitForTurnCompletion(process);
    try {
      await process.start();
      const threadId = await this.#startThread(process, options);
      turnCompletion.bindThread(threadId);
      await this.#startTurn(process, threadId, options);
      await turnCompletion.done;
    } finally {
      turnCompletion.unsubscribe();
      await process.stop();
    }
  }

  #buildEnvironment(
    options: CodexNativeRequestCaptureOptions
  ): Readonly<Record<string, string>> {
    return {
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
    };
  }

  async #startThread(
    process: CodexProcessLike,
    options: CodexNativeRequestCaptureOptions
  ): Promise<string> {
    const params = {
      cwd: options.workspacePath,
      approvalPolicy: this.#workspace.defaultApprovalMode,
      sandbox: this.#workspace.defaultSandboxMode,
      model: this.#resolveModelId(options),
      persistExtendedHistory: false,
    };
    await this.#recordDiagnosticContext(options, {
      kind: "codex_app_server_thread_start_request",
      payload: params,
    });
    const response = await process.request<Record<string, unknown>>(
      "thread/start",
      params
    );
    await this.#recordDiagnosticContext(options, {
      kind: "codex_app_server_thread_start_response",
      payload: response,
    });
    const thread = isRecord(response.thread) ? response.thread : null;
    const threadId = asString(thread?.id);
    if (!threadId) {
      throw new Error("diagnostic codex thread/start returned no thread id");
    }
    return threadId;
  }

  async #startTurn(
    process: CodexProcessLike,
    threadId: string,
    options: CodexNativeRequestCaptureOptions
  ): Promise<void> {
    const params = {
      threadId,
      input: [
        {
          type: "text",
          text: this.#resolveCapturePrompt(options),
          text_elements: [],
        },
      ],
      cwd: options.workspacePath,
      model: this.#resolveModelId(options),
      effort: this.#resolveReasoningEffort(options),
      summary: this.#resolveReasoningSummaryMode(),
    };
    await this.#recordDiagnosticContext(options, {
      kind: "codex_app_server_turn_start_request",
      payload: params,
    });
    const response = await process.request("turn/start", params);
    await this.#recordDiagnosticContext(options, {
      kind: "codex_app_server_turn_start_response",
      payload: response,
    });
  }

  async #recordDiagnosticContext(
    options: CodexNativeRequestCaptureOptions,
    record: {
      readonly kind: string;
      readonly payload: unknown;
    }
  ): Promise<void> {
    await options.recordDiagnosticContext?.(record);
  }

  #resolveModelId(options: CodexNativeRequestCaptureOptions): string | null {
    return (
      asString(options.appliedTurnConfig?.modelId) ??
      asString(options.selectedModelId) ??
      this.#workspace.defaultModel ??
      null
    );
  }

  #resolveReasoningEffort(
    options: CodexNativeRequestCaptureOptions
  ): CodexReasoningEffort | null {
    return (
      asCodexReasoningEffort(options.appliedTurnConfig?.reasoningEffort) ??
      this.#workspace.defaultReasoningEffort ??
      null
    );
  }

  #resolveCapturePrompt(options: CodexNativeRequestCaptureOptions): string {
    return asString(options.workflowPrompt) ?? options.probePrompt;
  }

  #waitForTurnCompletion(process: CodexProcessLike): {
    bindThread(threadId: string): void;
    readonly done: Promise<void>;
    unsubscribe(): void;
  } {
    let boundThreadId: string | null = null;
    let resolveDone: () => void = () => undefined;
    let rejectDone: (error: Error) => void = () => undefined;
    const timeout = setTimeout(() => {
      rejectDone(createTimeoutError());
    }, this.#turnTimeoutMs);
    const done = new Promise<void>((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    }).finally(() => {
      clearTimeout(timeout);
    });
    const unsubscribe = process.onNotification(({ method, params }) => {
      if (!this.#isBoundThreadNotification(params, boundThreadId)) {
        return;
      }
      if (method === "turn/completed" || method === "error") {
        resolveDone();
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

  #isBoundThreadNotification(
    params: unknown,
    threadId: string | null
  ): boolean {
    if (!threadId) {
      return false;
    }
    return isRecord(params) && asString(params.threadId) === threadId;
  }
}

const asCodexReasoningEffort = (value: unknown): CodexReasoningEffort | null =>
  value === "low" || value === "medium" || value === "high" || value === "xhigh"
    ? value
    : null;
