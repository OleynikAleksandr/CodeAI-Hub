import { homedir } from "node:os";
import path from "node:path";
import {
  type CodexWorkflowInvocationProfile,
  resolveCodexWorkflowInvocationProfile,
} from "../app-server/codex-workflow-instruction-profile";
import { CodexAppServerProcess } from "../app-server/process/codex-app-server-process";
import type { CodexAppServerProcessProfileKey } from "../app-server/process/codex-app-server-process-profile";
import type { ModuleReporter } from "../types";

const DEFAULT_KIMI_CODEX_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "kimi-codex",
  "home"
);
const DEFAULT_KIMI_CODEX_MODEL = "kimi-for-coding";
const DEFAULT_PROBE_PROMPT =
  "Ответь одним коротким предложением: Kimi-Codex probe is ready.";
const DEFAULT_TURN_TIMEOUT_MS = 60_000;

export type KimiCodexProbeFailureCategory =
  | "app_server_startup"
  | "missing_api_key"
  | "thread_start"
  | "turn_start"
  | "turn_timeout"
  | "unknown";

export interface KimiCodexAppServerProbeOptions {
  readonly approvalPolicy?: string;
  readonly kimiApiKey?: string;
  readonly modelId?: string;
  readonly processFactory?: KimiCodexProbeProcessFactory;
  readonly prompt?: string;
  readonly providerHome?: string;
  readonly reporter?: ModuleReporter;
  readonly sandbox?: string;
  readonly turnTimeoutMs?: number;
  readonly workspacePath: string;
}

export interface KimiCodexAppServerProbeEvent {
  readonly kind: string;
  readonly payload?: unknown;
}

export interface KimiCodexAppServerProbeResult {
  readonly events: readonly KimiCodexAppServerProbeEvent[];
  readonly failure?: {
    readonly category: KimiCodexProbeFailureCategory;
    readonly message: string;
  };
  readonly ok: boolean;
  readonly providerHome: string;
  readonly threadId?: string;
}

interface KimiCodexProbeProcessLike {
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

export type KimiCodexProbeProcessFactory = (options: {
  readonly environment: Readonly<Record<string, string>>;
  readonly processProfileKey: CodexAppServerProcessProfileKey;
  readonly providerCodexHome: string;
  readonly reporter?: ModuleReporter;
}) => KimiCodexProbeProcessLike;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const createProbeProcess: KimiCodexProbeProcessFactory = (options) =>
  new CodexAppServerProcess({
    environment: options.environment,
    processProfileKey: options.processProfileKey,
    providerCodexHome: options.providerCodexHome,
    providerHomeProfile: "kimiCodex",
    reporter: options.reporter,
  });

const resolveKimiApiKey = (
  options: KimiCodexAppServerProbeOptions
): string | null =>
  asString(options.kimiApiKey) ?? asString(process.env.KIMI_API_KEY);

const recordEvent = (
  events: KimiCodexAppServerProbeEvent[],
  kind: string,
  payload?: unknown
): void => {
  events.push(payload === undefined ? { kind } : { kind, payload });
};

const createFailure = (
  category: KimiCodexProbeFailureCategory,
  error: unknown
): KimiCodexAppServerProbeResult["failure"] => ({
  category,
  message: toErrorMessage(error),
});

const waitForTurnCompletion = (
  process: KimiCodexProbeProcessLike,
  threadId: string,
  timeoutMs: number
): {
  readonly done: Promise<void>;
  unsubscribe(): void;
} => {
  let rejectDone: (error: Error) => void = () => undefined;
  let resolveDone: () => void = () => undefined;
  const timeout = setTimeout(() => {
    rejectDone(new Error("Timed out waiting for Kimi-Codex turn completion"));
  }, timeoutMs);
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  }).finally(() => {
    clearTimeout(timeout);
  });
  const unsubscribe = process.onNotification(({ method, params }) => {
    if (!(isRecord(params) && asString(params.threadId) === threadId)) {
      return;
    }
    if (method === "turn/completed") {
      resolveDone();
      return;
    }
    if (method === "error") {
      rejectDone(new Error(JSON.stringify(params)));
    }
  });
  return { done, unsubscribe };
};

const startProbeThread = async (
  process: KimiCodexProbeProcessLike,
  options: KimiCodexAppServerProbeOptions,
  profile: CodexWorkflowInvocationProfile,
  events: KimiCodexAppServerProbeEvent[]
): Promise<string> => {
  const params = {
    approvalPolicy: options.approvalPolicy ?? "on-request",
    baseInstructions: profile.baseInstructions,
    config: profile.threadConfig,
    cwd: options.workspacePath,
    model: options.modelId ?? DEFAULT_KIMI_CODEX_MODEL,
    persistExtendedHistory: false,
    sandbox: options.sandbox ?? "workspace-write",
  };
  recordEvent(events, "thread_start_request", params);
  const response = await process.request<Record<string, unknown>>(
    "thread/start",
    params
  );
  recordEvent(events, "thread_start_response", response);
  const thread = isRecord(response.thread) ? response.thread : null;
  const threadId = asString(thread?.id);
  if (!threadId) {
    throw new Error("Kimi-Codex probe thread/start returned no thread id");
  }
  return threadId;
};

const startProbeTurn = async (
  process: KimiCodexProbeProcessLike,
  threadId: string,
  options: KimiCodexAppServerProbeOptions,
  events: KimiCodexAppServerProbeEvent[]
): Promise<void> => {
  const params = {
    cwd: options.workspacePath,
    input: [
      {
        text: options.prompt ?? DEFAULT_PROBE_PROMPT,
        text_elements: [],
        type: "text",
      },
    ],
    model: options.modelId ?? DEFAULT_KIMI_CODEX_MODEL,
    threadId,
  };
  recordEvent(events, "turn_start_request", params);
  const response = await process.request("turn/start", params);
  recordEvent(events, "turn_start_response", response);
};

export const runKimiCodexAppServerProbe = async (
  options: KimiCodexAppServerProbeOptions
): Promise<KimiCodexAppServerProbeResult> => {
  const events: KimiCodexAppServerProbeEvent[] = [];
  const providerHome = options.providerHome ?? DEFAULT_KIMI_CODEX_HOME;
  const kimiApiKey = resolveKimiApiKey(options);
  if (!kimiApiKey) {
    return {
      events,
      failure: {
        category: "missing_api_key",
        message: "KIMI_API_KEY is required for the Kimi-Codex app-server probe",
      },
      ok: false,
      providerHome,
    };
  }

  const profile = resolveCodexWorkflowInvocationProfile();
  const process = (options.processFactory ?? createProbeProcess)({
    environment: { KIMI_API_KEY: kimiApiKey },
    processProfileKey: profile.processProfileKey,
    providerCodexHome: providerHome,
    reporter: options.reporter,
  });

  try {
    recordEvent(events, "app_server_start");
    await process.start();
  } catch (error) {
    await process.stop();
    return {
      events,
      failure: createFailure("app_server_startup", error),
      ok: false,
      providerHome,
    };
  }

  try {
    const threadId = await startProbeThread(process, options, profile, events);
    const turnCompletion = waitForTurnCompletion(
      process,
      threadId,
      options.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS
    );
    try {
      await startProbeTurn(process, threadId, options, events);
      await turnCompletion.done;
    } catch (error) {
      const category =
        error instanceof Error && error.message.startsWith("Timed out")
          ? "turn_timeout"
          : "turn_start";
      return {
        events,
        failure: createFailure(category, error),
        ok: false,
        providerHome,
        threadId,
      };
    } finally {
      turnCompletion.unsubscribe();
    }

    return {
      events,
      ok: true,
      providerHome,
      threadId,
    };
  } catch (error) {
    return {
      events,
      failure: createFailure("thread_start", error),
      ok: false,
      providerHome,
    };
  } finally {
    await process.stop();
  }
};
