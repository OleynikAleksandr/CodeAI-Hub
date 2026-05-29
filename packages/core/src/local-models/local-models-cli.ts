import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type LmsCommandRunner = (
  args: readonly string[],
  options: { readonly timeoutMs: number }
) => string;

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
        return execFileSync(command, [...args], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          timeout: options.timeoutMs,
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Unable to execute LM Studio CLI.");
  };
