import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
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

export type QueryFunction = (payload: {
  readonly prompt: AsyncGenerator<unknown>;
  readonly options: Record<string, unknown>;
}) => AsyncIterableIterator<ClaudeStreamMessage> & {
  interrupt?: () => Promise<void>;
};

const SHORT_ID_LENGTH = 8;

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

export class ClaudeSDKManager {
  private sdkModule: { readonly query: QueryFunction } | null = null;
  private queryFunction: QueryFunction | null = null;
  private initialized = false;
  private readonly deps: ClaudeManagerDependencies;

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
    await this.ensureSessionStarted(sessionId, turnOptions);
    this.deps.processor.send(sessionId, content);
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.deps.sessions.closeSession(sessionId);
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.deps.sessions.getSession(sessionId);
  }

  private async ensureSessionStarted(
    sessionId: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void> {
    const session = this.deps.sessions.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    if (session.queryInstance) {
      return;
    }
    await this.initialize();

    const outputSchema = readOutputSchema(turnOptions);
    if (outputSchema) {
      session.structuredOutputSchema = outputSchema;
    }

    const filesBefore = this.deps.processor.getSDKFilesBefore();
    const tempId = session.sessionId;
    const queryInstance = this.invokeQuery(session);
    session.queryInstance = queryInstance;

    this.deps.processor
      .processResponses({
        sessionId: tempId,
        iterator: queryInstance,
        onRealSessionId: () => {
          /* sessionId promotion is handled via realSessionId event */
        },
      })
      .catch((error) => {
        this.deps.reporter?.error?.("Claude response processing failed", error);
      });

    this.deps.processor
      .getSessionIdFromSDKFiles(filesBefore)
      .then((fileSessionId) => {
        if (fileSessionId) {
          session.eventEmitter.emit("realSessionId", fileSessionId);
        }
      })
      .catch((error) => {
        this.deps.reporter?.error?.("Failed to read SDK session files", error);
      });

    session.eventEmitter.once("realSessionId", (realId: string) => {
      if (!realId || realId === tempId) {
        return;
      }
      this.promoteSessionId(tempId, realId, session);
    });
  }

  private promoteSessionId(
    tempId: string,
    realId: string,
    session?: ActiveSession
  ): void {
    this.deps.sessions.updateSessionId(tempId, realId);
    const targetSession = session ?? this.deps.sessions.getSession(realId);
    targetSession?.eventEmitter.emit("sessionIdChanged", {
      oldId: tempId,
      newId: realId,
      shortId: realId.slice(0, SHORT_ID_LENGTH),
    });
    targetSession?.logger?.renameSession?.(tempId, realId);
  }

  private invokeQuery(
    session: ActiveSession
  ): AsyncIterableIterator<ClaudeStreamMessage> & {
    interrupt?: () => Promise<void>;
  } {
    if (!(this.queryFunction && session.messageGenerator)) {
      throw new Error("SDK query function not initialized");
    }
    const projectPath = this.resolveProjectPath();
    const settingsSnapshot = this.loadClaudeSettingsSnapshot();
    const defaultModelOverride =
      this.resolveDefaultModelFromSnapshot(settingsSnapshot);
    const thinkingOptions = this.resolveThinkingOptions(settingsSnapshot);
    const resolvedModel =
      defaultModelOverride ?? this.deps.workspace.defaultModel;
    const options = {
      cwd: session.workspacePath,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      additionalDirectories: [session.workspacePath, homedir()],
      includePartialMessages: true,
      projectPath,
      settingSources: ["user", "project", "local"],
      environment: this.deps.authManager.getAuthEnvironment(),
      pathToClaudeCodeExecutable: this.deps.installer.getExecutablePath(),
      ...(resolvedModel ? { model: resolvedModel } : {}),
      ...thinkingOptions,
      ...(session.resumeSessionId ? { resume: session.resumeSessionId } : {}),
      ...(session.structuredOutputSchema
        ? {
            outputFormat: {
              type: "json_schema",
              schema: session.structuredOutputSchema,
            },
          }
        : {}),
    };
    const queryInstance = this.queryFunction({
      prompt: session.messageGenerator as AsyncGenerator<unknown>,
      options,
    });
    return queryInstance;
  }

  private resolveProjectPath(): string {
    return join(
      homedir(),
      ".claude",
      "projects",
      this.deps.workspace.claudeProjectSlug
    );
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
