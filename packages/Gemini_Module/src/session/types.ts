import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { EventEmitter } from "node:events";
import type { ModuleReporter } from "../types";

export type GeminiSessionLogger = {
  readonly start: (sessionId: string) => void;
  readonly logEvent: (event: Record<string, unknown>) => void;
  readonly logUserInput?: (payload: Record<string, unknown>) => void;
  readonly logCliOutput?: (payload: Record<string, unknown>) => void;
  readonly logError?: (payload: Record<string, unknown>) => void;
  readonly end: () => void;
};

export type ActiveSession = {
  sessionId: string;
  readonly createdAt: number;
  readonly eventEmitter: EventEmitter;
  readonly process: ChildProcessWithoutNullStreams;
  stdoutBuffer: string;
  status: "running" | "closing" | "closed";
  model: string | null;
  logger?: GeminiSessionLogger;
  reporter?: ModuleReporter;
};

export type SessionCreationOptions = {
  readonly binaryPath: string;
  readonly model?: string;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly reporter?: ModuleReporter;
  readonly logger?: GeminiSessionLogger | null;
};

export type SessionCreationResult = {
  readonly sessionId: string;
  readonly session: ActiveSession;
};
