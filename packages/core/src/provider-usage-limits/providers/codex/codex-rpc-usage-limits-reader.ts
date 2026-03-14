import { spawn } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { buildProviderUsageLimitScopeKey } from "../../provider-usage-limits-scope-key";
import type {
  ProviderUsageLimitsSnapshot,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";
import {
  CodexUsageLimitsNormalizer,
  extractCodexUsageLimitsSnapshotFromRateLimits,
} from "./codex-usage-limits-normalizer";

export const CODEAI_CODEX_RATE_LIMITS_PAYLOAD_ENV_KEY =
  "CODEAI_CODEX_RATE_LIMITS_PAYLOAD";
const CODEAI_CODEX_CLI_PATH_ENV_KEY = "CODEAI_CODEX_CLI_PATH";
const DEFAULT_APP_SERVER_TIMEOUT_MS = 10_000;
const APP_SERVER_INITIALIZE_REQUEST_ID = 1;
const APP_SERVER_RATE_LIMITS_REQUEST_ID = 2;
const DEFAULT_CODEX_CLI_CANDIDATE =
  process.platform === "win32" ? "codex.cmd" : "codex";
const FALLBACK_CODEX_CLI_CANDIDATE = path.join(
  homedir(),
  ".npm-global",
  "bin",
  process.platform === "win32" ? "codex.cmd" : "codex"
);
const STDIO_LINE_SPLIT_PATTERN = /\r?\n/u;

type CodexRuntimePayload = {
  readonly collectedAt?: string;
  readonly rateLimits?: unknown;
  readonly rate_limits?: unknown;
};

type JsonRpcEnvelope = {
  readonly error?: {
    readonly message?: string;
  } | null;
  readonly id?: number | string;
  readonly method?: string;
  readonly result?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseRuntimePayload = (
  value: string | null | undefined
): CodexRuntimePayload | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    return parsed as CodexRuntimePayload;
  } catch {
    return null;
  }
};

const resolveCodexCliCandidates = (): readonly string[] => {
  const candidates = [
    process.env[CODEAI_CODEX_CLI_PATH_ENV_KEY]?.trim(),
    DEFAULT_CODEX_CLI_CANDIDATE,
    FALLBACK_CODEX_CLI_CANDIDATE,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
};

const buildAppServerInitializeRequest = (): Record<string, unknown> => ({
  id: APP_SERVER_INITIALIZE_REQUEST_ID,
  method: "initialize",
  params: {
    clientInfo: {
      name: "codeai-hub",
      title: "CodeAI Hub",
      version: "1.1.726",
    },
    capabilities: {
      experimentalApi: false,
    },
  },
});

const buildAppServerRateLimitsRequest = (): Record<string, unknown> => ({
  id: APP_SERVER_RATE_LIMITS_REQUEST_ID,
  method: "account/rateLimits/read",
});

const extractAppServerRateLimitsResult = (
  envelope: JsonRpcEnvelope
):
  | {
      readonly rateLimits?: unknown;
      readonly rateLimitsByLimitId?: Record<string, unknown> | null;
    }
  | null
  | undefined => {
  if (envelope.id !== APP_SERVER_RATE_LIMITS_REQUEST_ID) {
    return;
  }

  if (envelope.error) {
    return null;
  }

  const result = isRecord(envelope.result) ? envelope.result : null;
  if (!result) {
    return null;
  }

  return {
    rateLimits: result.rateLimits,
    rateLimitsByLimitId: isRecord(result.rateLimitsByLimitId)
      ? result.rateLimitsByLimitId
      : null,
  };
};

export type CodexRpcUsageLimitsReaderOptions = {
  readonly envKey?: string;
  readonly normalizer?: CodexUsageLimitsNormalizer;
  readonly timeoutMs?: number;
};

export class CodexRpcUsageLimitsReader {
  readonly #envKey: string;
  readonly #normalizer: CodexUsageLimitsNormalizer;
  readonly #timeoutMs: number;

  constructor(options: CodexRpcUsageLimitsReaderOptions = {}) {
    this.#envKey = options.envKey ?? CODEAI_CODEX_RATE_LIMITS_PAYLOAD_ENV_KEY;
    this.#normalizer = options.normalizer ?? new CodexUsageLimitsNormalizer();
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_APP_SERVER_TIMEOUT_MS;
  }

  async read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null> {
    if (params.providerId !== "codex" || !params.providerSessionId?.trim()) {
      return null;
    }

    const runtimePayload = parseRuntimePayload(
      params.environment?.[this.#envKey] ?? process.env[this.#envKey]
    );
    if (runtimePayload) {
      const runtimeSnapshot = this.#buildSnapshot({
        collectedAt: runtimePayload.collectedAt ?? null,
        providerSessionId: params.providerSessionId,
        rateLimits: runtimePayload.rateLimits ?? runtimePayload.rate_limits,
      });
      if (runtimeSnapshot) {
        return runtimeSnapshot;
      }
    }

    for (const executablePath of resolveCodexCliCandidates()) {
      const appServerResult =
        await this.#readRateLimitsViaAppServer(executablePath);
      if (!appServerResult) {
        continue;
      }

      const snapshot = this.#buildSnapshot({
        collectedAt: new Date().toISOString(),
        providerSessionId: params.providerSessionId,
        rateLimits:
          appServerResult.rateLimitsByLimitId?.codex ??
          appServerResult.rateLimits,
      });
      if (snapshot) {
        return snapshot;
      }
    }

    return null;
  }

  #buildSnapshot(payload: {
    readonly collectedAt: string | null;
    readonly providerSessionId: string;
    readonly rateLimits: unknown;
  }): ProviderUsageLimitsSnapshot | null {
    const snapshot = extractCodexUsageLimitsSnapshotFromRateLimits({
      collectedAt: payload.collectedAt,
      rateLimits: payload.rateLimits,
    });
    if (!snapshot) {
      return null;
    }

    return this.#normalizer.normalize({
      providerScopeKey: buildProviderUsageLimitScopeKey({
        providerId: "codex",
        providerSessionId: payload.providerSessionId,
      }),
      snapshot,
      source: "codex_rpc",
    });
  }

  #readRateLimitsViaAppServer(executablePath: string): Promise<{
    readonly rateLimits?: unknown;
    readonly rateLimitsByLimitId?: Record<string, unknown> | null;
  } | null> {
    return new Promise((resolve) => {
      const child = spawn(
        executablePath,
        ["app-server", "--listen", "stdio://"],
        {
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      let settled = false;
      let stdoutBuffer = "";

      const finish = (
        result: {
          readonly rateLimits?: unknown;
          readonly rateLimitsByLimitId?: Record<string, unknown> | null;
        } | null
      ): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutHandle);
        child.stdout.removeAllListeners();
        child.stderr.removeAllListeners();
        child.removeAllListeners();
        if (!child.killed) {
          child.kill("SIGTERM");
        }
        resolve(result);
      };

      const send = (message: Record<string, unknown>): void => {
        child.stdin.write(`${JSON.stringify(message)}\n`);
      };

      const handleEnvelope = (envelope: JsonRpcEnvelope): void => {
        if (envelope.id === APP_SERVER_INITIALIZE_REQUEST_ID) {
          send({ method: "initialized" });
          send(buildAppServerRateLimitsRequest());
          return;
        }

        const result = extractAppServerRateLimitsResult(envelope);
        if (result === undefined) {
          return;
        }

        finish(result);
      };

      const timeoutHandle = setTimeout(() => {
        finish(null);
      }, this.#timeoutMs);

      child.on("error", () => {
        finish(null);
      });
      child.on("exit", () => {
        if (!settled) {
          finish(null);
        }
      });
      child.stdout.on("data", (chunk: Buffer) => {
        stdoutBuffer += chunk.toString("utf8");
        const lines = stdoutBuffer.split(STDIO_LINE_SPLIT_PATTERN);
        stdoutBuffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            continue;
          }
          try {
            handleEnvelope(JSON.parse(trimmed) as JsonRpcEnvelope);
          } catch {
            // Ignore non-JSON lines; app-server stdio is expected to be JSONL.
          }
        }
      });

      send(buildAppServerInitializeRequest());
    });
  }
}
