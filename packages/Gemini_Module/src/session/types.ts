import type { EventEmitter } from "node:events";
import type { Config } from "@google/gemini-cli-core/dist/src/config/config";
import type { GeminiClient } from "@google/gemini-cli-core/dist/src/core/client";
import type { GeminiSessionLogger } from "../logging/session-logger";
import type { ModuleReporter } from "../types";

export interface ActiveSession {
  abortController: AbortController | null;
  readonly client: GeminiClient;
  readonly config: Config;
  readonly contextWindowTokenLimit: number;
  readonly createdAt: number;
  readonly eventEmitter: EventEmitter;
  logger?: GeminiSessionLogger;
  reporter?: ModuleReporter;
  readonly runtimeTurnConfig: GeminiRuntimeTurnConfig;
  sessionId: string;
  status: "idle" | "streaming" | "closing" | "closed";
  readonly workspacePath: string;
}

export interface GeminiRuntimeTurnConfig {
  modelId?: string;
  thinkingDisplaySyncEnabled?: boolean;
  thinkingLevel?: string;
}

export interface SessionCreationOptions {
  readonly defaultModel?: string;
  readonly logger?: GeminiSessionLogger | null;
  readonly reporter?: ModuleReporter;
  readonly resumeSessionId?: string;
  readonly settingsPath?: string;
  readonly thinkingLevel?: string;
  readonly workspacePath: string;
}

export interface SessionCreationResult {
  readonly session: ActiveSession;
  readonly sessionId: string;
}
