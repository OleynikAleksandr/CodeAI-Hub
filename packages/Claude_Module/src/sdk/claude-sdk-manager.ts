import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import type { SDKAuthManager } from "../auth/sdk-auth-manager";
import type { SDKInstaller } from "../installer/sdk-installer";
import { SDKSessionLoggerFacade } from "../logging/sdk-session-logger";
import type { SDKMessageProcessor } from "../messaging/message-processor";
import type { SDKSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type {
  ClaudeStreamMessage,
  ClaudeWorkspaceOptions,
  ModuleReporter,
} from "../types";
import { resolveClaudeProviderProjectDir } from "./claude-provider-home";

export type QueryFunction = (payload: {
  readonly prompt: string;
  readonly options: Record<string, unknown>;
}) => AsyncIterableIterator<ClaudeStreamMessage> & {
  interrupt?: () => Promise<void>;
};

const SHORT_ID_LENGTH = 8;
const TEMP_SESSION_PREFIX = "temp_";

type ClaudeManagerDependencies = {
  readonly installer: SDKInstaller;
  readonly authManager: SDKAuthManager;
  readonly sessions: SDKSessionManager;
  readonly processor: SDKMessageProcessor;
  readonly workspace: ClaudeWorkspaceOptions;
  readonly reporter?: ModuleReporter;
  readonly enableDebugStreams?: boolean;
};

type ThinkingSettings = {
  readonly enabled: boolean;
  readonly maxTokens: number;
};

type ClaudeSettingsSnapshot = {
  readonly thinking?: {
    readonly enabled?: unknown;
    readonly maxTokens?: unknown;
  };
  readonly providers?: {
    readonly claude?: {
      readonly thinking?: {
        readonly enabled?: unknown;
        readonly maxTokens?: unknown;
      };
      readonly defaultModel?: unknown;
    };
  };
  readonly defaultModel?: unknown;
};

type ClaudeQueryOptions = {
  cwd: string;
  permissionMode: "bypassPermissions";
  allowDangerouslySkipPermissions: boolean;
  additionalDirectories: string[];
  includePartialMessages: boolean;
  projectPath: string;
  settingSources: string[];
  env: NodeJS.ProcessEnv;
  pathToClaudeCodeExecutable: string;
  model?: string;
  maxThinkingTokens?: number;
  resume?: string;
  outputFormat?: {
    type: "json_schema";
    schema: Record<string, unknown>;
  };
};

export class ClaudeSDKManager {
  private sdkModule: { readonly query: QueryFunction } | null = null;
  private queryFunction: QueryFunction | null = null;
  private initialized = false;
  private readonly deps: ClaudeManagerDependencies;
  private contextReaderConfigured = false;

  constructor(deps: ClaudeManagerDependencies) {
    this.deps = deps;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.deps.installer.ensureInstalled();
    await this.deps.authManager.ensureSubscriptionAuth();
    this.sdkModule = await this.deps.installer.loadModule<{
      readonly query: QueryFunction;
    }>();
    this.queryFunction = this.sdkModule.query;
    if (!this.contextReaderConfigured) {
      this.deps.processor.configureContextUsageReader({
        executablePath: this.deps.installer.getExecutablePath(),
        env: this.resolveAuthEnvironment(),
      });
      this.contextReaderConfigured = true;
    }
    this.initialized = true;
  }

  async createSession(workspacePath?: string): Promise<string> {
    await this.initialize();
    const actualWorkspacePath =
      workspacePath ?? this.deps.workspace.workspacePath;
    const { tempId } = this.deps.sessions.createSession(
      actualWorkspacePath,
      new SDKSessionLoggerFacade()
    );
    return tempId;
  }

  async resumeSession(
    sessionId: string,
    workspacePath?: string
  ): Promise<string> {
    await this.initialize();
    const actualWorkspacePath =
      workspacePath ?? this.deps.workspace.workspacePath;
    this.deps.sessions.createResumedSession(
      actualWorkspacePath,
      sessionId,
      new SDKSessionLoggerFacade()
    );
    return sessionId;
  }

  async sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void> {
    await this.initialize();
    const session = this.deps.sessions.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    this.deps.processor.enqueueTurn(
      session.sessionId,
      {
        content,
        turnOptions,
        internal: false,
        enqueuedAt: Date.now(),
      },
      {
        createIterator: (payload) => {
          const outputSchema = readOutputSchema(payload.turn.turnOptions);
          payload.session.structuredOutputSchema = outputSchema;
          return this.invokeQuery({
            session: payload.session,
            prompt: payload.turn.content,
            outputSchema,
          });
        },
        onRealSessionId: (payload) => {
          this.promoteSessionId(
            payload.previousSessionId,
            payload.realSessionId,
            payload.session
          );
        },
      }
    );
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.deps.sessions.closeSession(sessionId);
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.deps.sessions.getSession(sessionId);
  }

  private promoteSessionId(
    tempId: string,
    realId: string,
    session?: ActiveSession
  ): void {
    if (tempId === realId) {
      return;
    }
    this.deps.sessions.updateSessionId(tempId, realId);
    const targetSession = session ?? this.deps.sessions.getSession(realId);
    targetSession?.eventEmitter.emit("sessionIdChanged", {
      oldId: tempId,
      newId: realId,
      shortId: realId.slice(0, SHORT_ID_LENGTH),
    });
    targetSession?.logger?.renameSession?.(tempId, realId);
  }

  private invokeQuery(payload: {
    readonly session: ActiveSession;
    readonly prompt: string;
    readonly outputSchema: Record<string, unknown> | null;
  }): AsyncIterableIterator<ClaudeStreamMessage> & {
    interrupt?: () => Promise<void>;
  } {
    if (!this.queryFunction) {
      throw new Error("SDK query function not initialized");
    }
    const { outputSchema, prompt, session } = payload;
    const options = this.buildQueryOptions({ session, outputSchema });
    const queryInstance = this.queryFunction({
      prompt,
      options,
    });
    return queryInstance;
  }

  private resolveResumeSessionId(session: ActiveSession): string | null {
    if (session.sessionId.startsWith(TEMP_SESSION_PREFIX)) {
      return null;
    }
    return session.sessionId;
  }

  private buildQueryOptions(payload: {
    readonly session: ActiveSession;
    readonly outputSchema: Record<string, unknown> | null;
  }): ClaudeQueryOptions {
    const { outputSchema, session } = payload;
    const settingsSnapshot = this.loadClaudeSettingsSnapshot();
    const defaultModelOverride =
      this.resolveDefaultModelFromSnapshot(settingsSnapshot);
    const resolvedModel =
      defaultModelOverride ?? this.deps.workspace.defaultModel;
    const thinkingOptions = this.resolveThinkingOptions(settingsSnapshot);
    const resumeSessionId = this.resolveResumeSessionId(session);
    const options: ClaudeQueryOptions = {
      cwd: session.workspacePath,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      additionalDirectories: [session.workspacePath, homedir()],
      includePartialMessages: true,
      projectPath: this.resolveProjectPath(),
      settingSources: ["user", "project", "local"],
      env: this.resolveAuthEnvironment(),
      pathToClaudeCodeExecutable: this.deps.installer.getExecutablePath(),
    };
    if (resolvedModel) {
      options.model = resolvedModel;
    }
    if (typeof thinkingOptions.maxThinkingTokens === "number") {
      options.maxThinkingTokens = thinkingOptions.maxThinkingTokens;
    }
    if (resumeSessionId) {
      options.resume = resumeSessionId;
    }
    if (outputSchema) {
      options.outputFormat = {
        type: "json_schema",
        schema: outputSchema,
      };
    }
    return options;
  }

  private resolveProjectPath(): string {
    return resolveClaudeProviderProjectDir(
      this.deps.workspace.claudeProjectSlug
    );
  }

  private resolveAuthEnvironment(): NodeJS.ProcessEnv {
    return { ...this.deps.authManager.getAuthEnvironment() };
  }

  private resolveThinkingOptions(snapshot: ClaudeSettingsSnapshot | null): {
    readonly maxThinkingTokens?: number;
  } {
    const payload = this.resolveThinkingSettings(snapshot);
    if (!payload?.enabled) {
      return {};
    }
    return { maxThinkingTokens: payload.maxTokens };
  }

  private resolveThinkingSettings(
    snapshot: ClaudeSettingsSnapshot | null
  ): ThinkingSettings | null {
    const candidate =
      snapshot?.providers?.claude?.thinking ?? snapshot?.thinking;
    if (
      !candidate ||
      typeof candidate.enabled !== "boolean" ||
      typeof candidate.maxTokens !== "number"
    ) {
      return null;
    }
    return {
      enabled: candidate.enabled,
      maxTokens: candidate.maxTokens,
    };
  }

  private resolveDefaultModelFromSnapshot(
    snapshot: ClaudeSettingsSnapshot | null
  ): string | undefined {
    const candidate =
      snapshot?.providers?.claude?.defaultModel ?? snapshot?.defaultModel;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
    return;
  }

  private loadClaudeSettingsSnapshot(): ClaudeSettingsSnapshot | null {
    const settingsPath = this.deps.workspace.settingsPath;
    if (!settingsPath) {
      return null;
    }
    try {
      const raw = readFileSync(settingsPath, "utf8");
      return JSON.parse(raw) as ClaudeSettingsSnapshot;
    } catch {
      return null;
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readOutputSchema = (
  turnOptions?: Record<string, unknown>
): Record<string, unknown> | null => {
  if (!turnOptions) {
    return null;
  }
  const schema = turnOptions.outputSchema;
  return isRecord(schema) ? schema : null;
};
