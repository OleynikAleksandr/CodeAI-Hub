import { spawn } from "node:child_process";

const PROCESS_PATH_SEPARATOR = process.platform === "win32" ? ";" : ":";
const EXTRA_PROCESS_PATHS =
  process.platform === "win32" ? [] : ["/usr/local/bin", "/opt/homebrew/bin"];

interface ProcessResult {
  readonly exitCode: number | null;
  readonly ok: boolean;
  readonly signal: NodeJS.Signals | null;
  readonly stderr: string;
  readonly stdout: string;
  readonly timedOut: boolean;
}

export const runShell = (
  command: string,
  cwd: string,
  timeoutMs: number,
  maxOutputChars: number,
  shell?: string
): Promise<ProcessResult> => {
  if (process.platform === "win32") {
    return runProcess(
      shell ?? "cmd.exe",
      ["/d", "/s", "/c", command],
      cwd,
      timeoutMs,
      maxOutputChars
    );
  }
  return runProcess(
    shell ?? process.env.SHELL ?? "/bin/sh",
    ["-lc", command],
    cwd,
    timeoutMs,
    maxOutputChars
  );
};

export const runProcess = (
  command: string,
  args: readonly string[],
  cwd: string,
  timeoutMs: number,
  maxOutputChars: number,
  input?: string
): Promise<ProcessResult> =>
  new Promise((resolve) => {
    const stdout = createOutputCollector(maxOutputChars);
    const stderr = createOutputCollector(maxOutputChars);
    let timedOut = false;
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        PATH: [process.env.PATH, ...EXTRA_PROCESS_PATHS]
          .filter(Boolean)
          .join(PROCESS_PATH_SEPARATOR),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => stdout.append(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.append(chunk));
    child.once("error", (error) => {
      clearTimeout(timer);
      resolve({
        exitCode: null,
        ok: false,
        signal: null,
        stderr: stderr.value(),
        stdout: stdout.value(),
        timedOut,
        ...(error.message ? { error: error.message } : {}),
      } as ProcessResult & { readonly error?: string });
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        ok: code === 0,
        signal,
        stderr: stderr.value(),
        stdout: stdout.value(),
        timedOut,
      });
    });
    if (typeof input === "string") {
      child.stdin?.end(input);
    } else {
      child.stdin?.end();
    }
  });

const createOutputCollector = (maxChars: number) => {
  let value = "";
  let truncated = false;
  return {
    append(chunk: Buffer) {
      if (value.length >= maxChars) {
        truncated = true;
        return;
      }
      const next = chunk.toString("utf8");
      const available = maxChars - value.length;
      value += next.slice(0, available);
      truncated ||= next.length > available;
    },
    value() {
      return truncated ? `${value}\n...[truncated]` : value;
    },
  };
};
