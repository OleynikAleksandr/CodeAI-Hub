import { spawn } from "node:child_process";

interface ExecFailure {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly signal?: unknown;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
}

export interface ContextUsageProbeResult {
  readonly cmd: string;
  readonly code: number | null;
  readonly durationMs: number;
  readonly signal: NodeJS.Signals | null;
  readonly stderrTail: string;
  readonly stdoutTail: string;
  readonly timeout: boolean;
}

const isWindows = process.platform === "win32";

const CONTEXT_READ_TIMEOUT_MS = 120_000;
const PROCESS_KILL_GRACE_MS = 2000;
const MAX_TAIL_CHARS = 4000;

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

const appendTail = (current: string, chunk: string): string => {
  const combined = current + chunk;
  return combined.length > MAX_TAIL_CHARS
    ? combined.slice(combined.length - MAX_TAIL_CHARS)
    : combined;
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

export const runClaudeContextUsageProbe = (options: {
  readonly executablePath: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
}): Promise<ContextUsageProbeResult> => {
  const resolved = resolveClaudeRunner({
    executablePath: options.executablePath,
    args: options.args,
  });

  const start = process.hrtime.bigint();

  let stdoutTail = "";
  let stderrTail = "";
  let killedByTimeout = false;

  const child = spawn(resolved.runner, resolved.args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return new Promise<ContextUsageProbeResult>((resolve, reject) => {
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

    const finishWithResult = (
      code: number | null,
      signal: NodeJS.Signals | null
    ): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      resolve({
        code,
        signal,
        stdoutTail,
        stderrTail,
        durationMs: Math.round(durationMs()),
        timeout: killedByTimeout,
        cmd: formatCommandForLogs(),
      });
    };

    timeout = setTimeout(() => {
      killedByTimeout = true;
      safeKill("SIGTERM");
      killGrace = setTimeout(() => {
        safeKill("SIGKILL");
      }, PROCESS_KILL_GRACE_MS);
    }, CONTEXT_READ_TIMEOUT_MS);

    child.on("error", (error) => {
      finishWithError(error);
    });

    child.stdout?.on("data", (data: Buffer) => {
      stdoutTail = appendTail(stdoutTail, data.toString("utf8"));
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderrTail = appendTail(stderrTail, data.toString("utf8"));
    });

    child.on("close", (code, signal) => {
      finishWithResult(code, signal);
    });
  });
};
