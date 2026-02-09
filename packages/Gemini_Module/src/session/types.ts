import type { EventEmitter } from "node:events";
import type { Config } from "@google/gemini-cli-core/dist/src/config/config";
import type { GeminiClient } from "@google/gemini-cli-core/dist/src/core/client";
import type { GeminiSessionLogger } from "../logging/session-logger";
import type { ModuleReporter } from "../types";

export type ActiveSession = {
  sessionId: string;
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
  readonly resumeSessionId?: string;
  readonly defaultModel?: string;
  readonly thinkingLevel?: string;
  readonly settingsPath?: string;
  readonly reporter?: ModuleReporter;
  readonly logger?: GeminiSessionLogger | null;
};

export type SessionCreationResult = {
  readonly sessionId: string;
  readonly session: ActiveSession;
};
