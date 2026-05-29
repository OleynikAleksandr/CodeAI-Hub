import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type LmsCommandRunner = (
  args: readonly string[],
  options: { readonly timeoutMs: number }
) => string;

interface LmStudioServerReadinessOptions {
  readonly commandRunner: LmsCommandRunner;
  readonly reporter?: {
    readonly warn?: (
      message: string,
      context?: Record<string, unknown>
    ) => void;
  };
}

const SERVER_STATUS_TIMEOUT_MS = 5000;
const SERVER_START_TIMEOUT_MS = 30_000;
const SERVER_RUNNING_PATTERN = /\bServer:\s*ON\b|\bserver\b.*\brunning\b/iu;

export const resolveLmsCommandCandidates = (): readonly string[] => [
  "lms",
  path.join(homedir(), ".lmstudio", "bin", "lms"),
  "/opt/homebrew/bin/lms",
  "/usr/local/bin/lms",
];

const shouldTryCandidate = (candidate: string): boolean =>
  candidate === "lms" || existsSync(candidate);

export const createDefaultLmsCommandRunner =
  (): LmsCommandRunner => (args, options) => {
    let lastError: unknown = null;
    for (const command of resolveLmsCommandCandidates()) {
      if (!shouldTryCandidate(command)) {
        continue;
      }
      try {
        const result = spawnSync(command, [...args], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: options.timeoutMs,
        });
        if (result.error) {
          throw result.error;
        }
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
        if (result.status !== 0) {
          throw new Error(output || `LM Studio CLI exited ${result.status}.`);
        }
        return output;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Unable to execute LM Studio CLI.");
  };

const isLmStudioServerRunning = (output: string): boolean =>
  SERVER_RUNNING_PATTERN.test(output);

export const ensureLmStudioServerRunning = (
  options: LmStudioServerReadinessOptions
): string | null => {
  try {
    const statusOutput = options.commandRunner(["server", "status"], {
      timeoutMs: SERVER_STATUS_TIMEOUT_MS,
    });
    if (isLmStudioServerRunning(statusOutput)) {
      return null;
    }
  } catch (error) {
    options.reporter?.warn?.("LM Studio server status check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    options.commandRunner(["server", "start"], {
      timeoutMs: SERVER_START_TIMEOUT_MS,
    });
  } catch (error) {
    options.reporter?.warn?.("LM Studio server start failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return "lmstudio_server_start_failed";
  }

  try {
    const statusOutput = options.commandRunner(["server", "status"], {
      timeoutMs: SERVER_STATUS_TIMEOUT_MS,
    });
    return isLmStudioServerRunning(statusOutput)
      ? null
      : "lmstudio_server_unavailable";
  } catch (error) {
    options.reporter?.warn?.("LM Studio server status check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return "lmstudio_server_unavailable";
  }
};
