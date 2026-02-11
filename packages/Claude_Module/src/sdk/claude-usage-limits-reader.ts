import { spawn } from "node:child_process";
import { resolveCwdForClaudeSession } from "./claude-context-usage-cwd-resolver";
import type { UsageLimitsSnapshot } from "./claude-usage-limits-snapshot";
import { extractUsageLimitsFromStreamJsonLine } from "./claude-usage-limits-snapshot";

type UsageLimitsReaderOptions = {
  readonly executablePath: string;
  readonly env: NodeJS.ProcessEnv;
};

type ExecFailure = {
  readonly code?: unknown;
  readonly signal?: unknown;
  readonly stdout?: unknown;
  readonly stderr?: unknown;
  readonly message?: unknown;
};

const isWindows = process.platform === "win32";
const USAGE_READ_TIMEOUT_MS = 120_000;
const PROCESS_KILL_GRACE_MS = 2000;
const MAX_TAIL_CHARS = 4000;
const TEMP_SESSION_PREFIX = "temp_";

// Service-only command: should be as cheap as possible.
const SERVICE_MODEL_ALIAS = "haiku";

const resolveClaudeRunner = (payload: {
  readonly executablePath: string;
  readonly args: readonly string[];
}): { readonly runner: string; readonly args: string[] } => {
  if (isWindows) {
    return { runner: payload.executablePath, args: [...payload.args] };
  }
  return {
    runner: process.execPath,
    args: [payload.executablePath, ...payload.args],
  };
};

const toOptionalString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toOptionalCodeString = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
};

const formatExecFailure = (error: unknown): string => {
  const failure = error as ExecFailure;
  const message = toOptionalString(failure.message) ?? String(error);
  const stderr = toOptionalString(failure.stderr);
  const stdout = toOptionalString(failure.stdout);
  const code = toOptionalCodeString(failure.code);
  const signal = toOptionalString(failure.signal);

  const details: string[] = [message];
  if (code) {
    details.push(`code=${code}`);
  }
  if (signal) {
    details.push(`signal=${signal}`);
  }
  if (stderr?.trim()) {
    details.push(`stderr=${JSON.stringify(stderr.trim())}`);
  }
  if (stdout?.trim()) {
    details.push(`stdout=${JSON.stringify(stdout.trim())}`);
  }

  return details.join(" | ");
};

const appendTail = (current: string, chunk: string): string => {
  const combined = current + chunk;
  return combined.length > MAX_TAIL_CHARS
    ? combined.slice(combined.length - MAX_TAIL_CHARS)
    : combined;
};

const readSnapshotFromStream = (payload: {
  readonly chunk: string;
  readonly buffer: string;
}): {
  readonly nextBuffer: string;
  readonly snapshot: UsageLimitsSnapshot | null;
} => {
  const combined = payload.buffer + payload.chunk;
  const lines = combined.split(/\r?\n/g);
  const nextBuffer = lines.pop() ?? "";

  for (const line of lines) {
    const snapshot = extractUsageLimitsFromStreamJsonLine(line);
    if (snapshot) {
      return { nextBuffer, snapshot };
    }
  }

  return { nextBuffer, snapshot: null };
};

const runClaudeCliForUsageSnapshot = (options: {
  readonly executablePath: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
}): Promise<UsageLimitsSnapshot> => {
  const resolved = resolveClaudeRunner({
    executablePath: options.executablePath,
    args: options.args,
  });

  const start = process.hrtime.bigint();

  let stdoutTail = "";
  let stderrTail = "";
  let stdoutBuffer = "";
  let stderrBuffer = "";
  let snapshot: UsageLimitsSnapshot | null = null;
  let killedByTimeout = false;

  const child = spawn(resolved.runner, resolved.args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return new Promise<UsageLimitsSnapshot>((resolve, reject) => {
    let settled = false;
    let timeout: NodeJS.Timeout | null = null;
    let killGrace: NodeJS.Timeout | null = null;

    const safeKill = (signal?: NodeJS.Signals): void => {
      try {
        child.kill(signal);
      } catch {
        // ignore
      }
    };

    const formatCommandForLogs = (): string =>
      `${resolved.runner} ${resolved.args.map((arg) => JSON.stringify(arg)).join(" ")}`;

    const clearTimers = (): void => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (killGrace) {
        clearTimeout(killGrace);
      }
    };

    const durationMs = (): number =>
      Number(process.hrtime.bigint() - start) / 1_000_000;

    const pushIf = (
      target: string[],
      condition: boolean,
      value: string
    ): void => {
      if (condition) {
        target.push(value);
      }
    };

    const pushIfPresent = (
      target: string[],
      label: string,
      value: string | null
    ): void => {
      if (!value?.trim()) {
        return;
      }
      target.push(`${label}=${JSON.stringify(value.trim())}`);
    };

    const finishWithError = (
      error: unknown,
      meta?: {
        readonly code?: number | null;
        readonly signal?: NodeJS.Signals | null;
      }
    ): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();

      const base = formatExecFailure(error);
      const extras: string[] = [
        `cwd=${JSON.stringify(options.cwd)}`,
        `duration_ms=${Math.round(durationMs())}`,
        `cmd=${JSON.stringify(formatCommandForLogs())}`,
      ];
      pushIf(extras, killedByTimeout, "timeout=true");
      pushIf(
        extras,
        meta?.code !== undefined && meta.code !== null,
        `code=${meta?.code}`
      );
      pushIf(extras, Boolean(meta?.signal), `signal=${meta?.signal}`);
      pushIfPresent(extras, "stderr_tail", stderrTail);
      pushIfPresent(extras, "stdout_tail", stdoutTail);
      reject(new Error([base, ...extras].join(" | ")));
    };

    const finishWithSnapshot = (value: UsageLimitsSnapshot): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      resolve(value);
    };

    timeout = setTimeout(() => {
      killedByTimeout = true;
      safeKill("SIGTERM");
      killGrace = setTimeout(() => {
        safeKill("SIGKILL");
      }, PROCESS_KILL_GRACE_MS);
    }, USAGE_READ_TIMEOUT_MS);

    child.on("error", (error) => {
      finishWithError(error);
    });

    child.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString("utf8");
      stdoutTail = appendTail(stdoutTail, chunk);
      const parsed = readSnapshotFromStream({ chunk, buffer: stdoutBuffer });
      stdoutBuffer = parsed.nextBuffer;
      if (parsed.snapshot) {
        snapshot = parsed.snapshot;
        safeKill("SIGTERM");
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString("utf8");
      stderrTail = appendTail(stderrTail, chunk);
      const parsed = readSnapshotFromStream({ chunk, buffer: stderrBuffer });
      stderrBuffer = parsed.nextBuffer;
      if (parsed.snapshot) {
        snapshot = parsed.snapshot;
        safeKill("SIGTERM");
      }
    });

    child.on("close", (code, signal) => {
      if (snapshot) {
        finishWithSnapshot(snapshot);
        return;
      }

      const error: ExecFailure = {
        message: "Claude /usage did not produce usage limits snapshot",
        code,
        signal,
        stdout: stdoutTail,
        stderr: stderrTail,
      };
      finishWithError(error, { code, signal });
    });
  });
};

export class ClaudeUsageLimitsReader {
  private readonly options: UsageLimitsReaderOptions;

  constructor(options: UsageLimitsReaderOptions) {
    this.options = options;
  }

  async read(payload: {
    readonly sessionId: string;
    readonly cwd: string;
  }): Promise<UsageLimitsSnapshot | null> {
    if (payload.sessionId.startsWith(TEMP_SESSION_PREFIX)) {
      return null;
    }
    const resolvedCwd = await resolveCwdForClaudeSession({
      sessionId: payload.sessionId,
      fallbackCwd: payload.cwd,
    });
    const snapshot = await runClaudeCliForUsageSnapshot({
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
        "/usage",
      ],
      cwd: resolvedCwd,
      env: this.options.env,
    });
    return snapshot;
  }
}
