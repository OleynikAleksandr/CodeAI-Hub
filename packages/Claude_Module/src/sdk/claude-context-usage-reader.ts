import { resolveCwdForClaudeSession } from "./claude-context-usage-cwd-resolver";
import { runClaudeContextUsageProbe } from "./claude-context-usage-probe";
import {
  readSnapshotFromProviderJsonlWithRetries,
  resolveProviderJsonlPathForClaudeSession,
  safeReadFileSize,
} from "./claude-context-usage-provider-jsonl";
import type { ContextUsageSnapshot } from "./claude-context-usage-snapshot";
import { extractSnapshotFromStreamJsonLine } from "./claude-context-usage-snapshot";

interface ContextUsageReaderOptions {
  readonly env: NodeJS.ProcessEnv;
  readonly executablePath: string;
}

const TEMP_SESSION_PREFIX = "temp_";

// Service-only command: should be as cheap as possible.
const SERVICE_MODEL_ALIAS = "haiku";
const CLAUDE_OAUTH_ENV_KEY = "CLAUDE_CODE_OAUTH_TOKEN";

const extractSnapshotFromStreamText = (
  text: string
): ContextUsageSnapshot | null => {
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  let latest: ContextUsageSnapshot | null = null;
  for (const line of lines) {
    const snapshot = extractSnapshotFromStreamJsonLine(line);
    if (snapshot) {
      latest = snapshot;
    }
  }
  return latest;
};

export class ClaudeContextUsageReader {
  private readonly options: ContextUsageReaderOptions;
  private readonly providerJsonlPathCache = new Map<string, string>();

  constructor(options: ContextUsageReaderOptions) {
    this.options = options;
  }

  async read(payload: {
    readonly sessionId: string;
    readonly cwd: string;
  }): Promise<ContextUsageSnapshot | null> {
    if (payload.sessionId.startsWith(TEMP_SESSION_PREFIX)) {
      return null;
    }

    const providerJsonlPath = await this.resolveProviderJsonlPath(
      payload.sessionId
    );
    const providerJsonlStartSize = providerJsonlPath
      ? await safeReadFileSize(providerJsonlPath)
      : null;

    const resolvedCwd = await resolveCwdForClaudeSession({
      sessionId: payload.sessionId,
      fallbackCwd: payload.cwd,
    });

    const probe = await runClaudeContextUsageProbe({
      executablePath: this.options.executablePath,
      args: [
        "-p",
        "--verbose",
        "--output-format",
        "stream-json",
        "--model",
        SERVICE_MODEL_ALIAS,
        "--resume",
        payload.sessionId,
        "/context",
      ],
      cwd: resolvedCwd,
      env: this.resolveRuntimeEnv(),
    });

    if (providerJsonlPath) {
      const snapshot = await readSnapshotFromProviderJsonlWithRetries({
        jsonlPath: providerJsonlPath,
        fromByteOffset: providerJsonlStartSize,
      });
      if (snapshot) {
        return snapshot;
      }
    }

    const snapshotFromOutput = extractSnapshotFromStreamText(
      [probe.stdoutTail, probe.stderrTail]
        .filter((value) => value.trim())
        .join("\n")
    );
    if (snapshotFromOutput) {
      return snapshotFromOutput;
    }

    const details: string[] = [
      "Claude /context did not produce token usage snapshot",
      `cmd=${JSON.stringify(probe.cmd)}`,
      `cwd=${JSON.stringify(resolvedCwd)}`,
      `duration_ms=${probe.durationMs}`,
    ];
    if (probe.timeout) {
      details.push("timeout=true");
    }
    if (probe.code !== null) {
      details.push(`code=${probe.code}`);
    }
    if (probe.signal) {
      details.push(`signal=${probe.signal}`);
    }
    if (providerJsonlPath) {
      details.push(`provider_jsonl=${JSON.stringify(providerJsonlPath)}`);
    }
    if (probe.stderrTail.trim()) {
      details.push(`stderr_tail=${JSON.stringify(probe.stderrTail.trim())}`);
    }
    if (probe.stdoutTail.trim()) {
      details.push(`stdout_tail=${JSON.stringify(probe.stdoutTail.trim())}`);
    }
    throw new Error(details.join(" | "));
  }

  private async resolveProviderJsonlPath(
    sessionId: string
  ): Promise<string | null> {
    const cached = this.providerJsonlPathCache.get(sessionId);
    if (cached) {
      return cached;
    }
    const resolved = await resolveProviderJsonlPathForClaudeSession(sessionId);
    if (resolved) {
      this.providerJsonlPathCache.set(sessionId, resolved);
    }
    return resolved;
  }

  private resolveRuntimeEnv(): NodeJS.ProcessEnv {
    const merged = { ...this.options.env };
    if (!merged[CLAUDE_OAUTH_ENV_KEY]) {
      const runtimeToken = process.env[CLAUDE_OAUTH_ENV_KEY]?.trim();
      if (runtimeToken) {
        merged[CLAUDE_OAUTH_ENV_KEY] = runtimeToken;
      }
    }
    return merged;
  }
}
