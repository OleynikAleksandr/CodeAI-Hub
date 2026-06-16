import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { GlmOpenCodeSessionEvent } from "./glm-opencode-output-normalizer";
import { normalizeOpenCodeJsonLine } from "./glm-opencode-output-normalizer";
import type { GlmOpenCodeRuntimeProfile } from "./glm-opencode-runtime-profile";

export interface GlmOpenCodeRunOptions {
  readonly content: string;
  readonly modelSelector: string;
  readonly onChildProcess?: (child: ChildProcessWithoutNullStreams) => void;
  readonly onEvent: (event: GlmOpenCodeSessionEvent) => void;
  readonly profile: GlmOpenCodeRuntimeProfile;
}

const MAX_DIAGNOSTIC_LENGTH = 1500;
const LINE_SPLIT_PATTERN = /\r?\n/u;

interface GlmOpenCodeRunState {
  assistantEvents: number;
  terminalFailure: string | null;
}

const trimDiagnosticTail = (value: string): string =>
  value.trim().slice(-MAX_DIAGNOSTIC_LENGTH);

const buildArgs = (options: GlmOpenCodeRunOptions): string[] => [
  "--print-logs",
  "--log-level",
  "INFO",
  "run",
  "--dangerously-skip-permissions",
  "--format",
  "json",
  "--model",
  options.modelSelector,
  options.content,
];

const emitFailure = (options: GlmOpenCodeRunOptions, message: string): void => {
  options.onEvent({
    message,
    provider: "glmOpenCode",
    timestamp: new Date().toISOString(),
    type: "turn_failed",
    uuid: `${randomUUID()}::turn_failed`,
  });
};

const emitNormalizedLineEvents = (
  line: string,
  options: GlmOpenCodeRunOptions,
  state: GlmOpenCodeRunState
): void => {
  for (const event of normalizeOpenCodeJsonLine(line)) {
    if (event.type === "assistant") {
      state.assistantEvents += 1;
    }
    if (event.type === "turn_failed") {
      state.terminalFailure = event.message ?? "OpenCode reported an error.";
    }
    options.onEvent(event);
  }
};

const emitCompleted = (options: GlmOpenCodeRunOptions): void => {
  options.onEvent({
    data: { modelSelector: options.modelSelector },
    provider: "glmOpenCode",
    timestamp: new Date().toISOString(),
    type: "turn_completed",
    uuid: `${randomUUID()}::turn_completed`,
  });
};

const isSuccessfulClose = (
  code: number | null,
  signal: NodeJS.Signals | null,
  state: GlmOpenCodeRunState
): boolean =>
  code === 0 && !signal && state.assistantEvents > 0 && !state.terminalFailure;

const buildCloseFailureDiagnostic = (params: {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly state: GlmOpenCodeRunState;
  readonly stderrTail: string;
}): string => {
  const reason =
    params.state.terminalFailure ??
    (params.signal
      ? `OpenCode process stopped with signal ${params.signal}.`
      : `OpenCode process exited with code ${params.code ?? "unknown"}.`);
  return params.stderrTail ? `${reason}\n${params.stderrTail}` : reason;
};

export const runGlmOpenCodeTurn = (
  options: GlmOpenCodeRunOptions
): Promise<void> =>
  new Promise((resolve, reject) => {
    const cwd = options.profile.workspacePath ?? process.cwd();
    const child = spawn(options.profile.command, buildArgs(options), {
      cwd,
      env: options.profile.environment,
    });
    options.onChildProcess?.(child);

    const state: GlmOpenCodeRunState = {
      assistantEvents: 0,
      terminalFailure: null,
    };
    let stdoutBuffer = "";
    let stderrTail = "";

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split(LINE_SPLIT_PATTERN);
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        emitNormalizedLineEvents(line, options, state);
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderrTail = trimDiagnosticTail(`${stderrTail}${chunk}`);
    });

    child.on("error", (error) => {
      const message = `Failed to start GLM-OpenCode runtime: ${error.message}`;
      emitFailure(options, message);
      reject(new Error(message));
    });

    child.on("close", (code, signal) => {
      if (stdoutBuffer.trim().length > 0) {
        emitNormalizedLineEvents(stdoutBuffer, options, state);
      }
      if (isSuccessfulClose(code, signal, state)) {
        emitCompleted(options);
        resolve();
        return;
      }
      const diagnostic = buildCloseFailureDiagnostic({
        code,
        signal,
        state,
        stderrTail,
      });
      emitFailure(options, diagnostic);
      reject(new Error(diagnostic));
    });
  });
