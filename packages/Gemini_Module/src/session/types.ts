import type { EventEmitter } from "node:events";
import type { Config } from "@google/gemini-cli-core/dist/src/config/config.js";
import type { GeminiClient } from "@google/gemini-cli-core/dist/src/core/client.js";
import type { GeminiSessionLogger } from "../logging/session-logger.js";
import type { ModuleReporter } from "../types/index.js";

export type ActiveSession = {
  readonly sessionId: string;
  readonly createdAt: number;
  readonly eventEmitter: EventEmitter;
  readonly config: Config;
  readonly client: GeminiClient;
  readonly workspacePath: string;
  status: "idle" | "streaming" | "closing" | "closed";
  abortController: AbortController | null;
  logger?: GeminiSessionLogger;
  reporter?: ModuleReporter;
};

export type SessionCreationOptions = {
  readonly workspacePath: string;
  readonly defaultModel?: string;
  readonly reporter?: ModuleReporter;
  readonly logger?: GeminiSessionLogger | null;
};

export type SessionCreationResult = {
  readonly sessionId: string;
  readonly session: ActiveSession;
};
