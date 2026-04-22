import { CodexAppServerFacade } from "../app-server/codex-app-server-facade";
import type {
  CodexModuleOptions,
  CodexTurnOptions,
  CodexUsageLimitsStreamPayload,
} from "../types";

export class CodexProviderAdapter {
  readonly usageLimitsFacade?: CodexModuleOptions["usageLimitsFacade"];
  private readonly facade: CodexAppServerFacade;

  constructor(options: CodexModuleOptions) {
    this.usageLimitsFacade = options.usageLimitsFacade;
    this.facade = new CodexAppServerFacade(options);
  }

  initialize(): Promise<void> {
    return this.facade.initialize();
  }

  createSession(workspacePath?: string): Promise<string> {
    return this.facade.createSession(workspacePath);
  }

  resumeSession(sessionId: string, workspacePath?: string): Promise<string> {
    return this.facade.resumeSession(sessionId, workspacePath);
  }

  closeSession(sessionId: string): Promise<void> {
    return this.facade.closeSession(sessionId);
  }

  sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: CodexTurnOptions
  ): Promise<void> {
    return this.facade.sendMessage(sessionId, content, turnOptions);
  }

  subscribe(
    sessionId: string,
    listener: (payload: unknown) => void
  ): () => void {
    return this.facade.subscribe(sessionId, listener);
  }

  async refreshUsageLimits(params: {
    readonly broadcast: (event: unknown) => void;
    readonly providerSessionId: string;
    readonly runtimeSessionId: string;
    readonly workspacePath: string;
  }): Promise<void> {
    const payload = await this.facade
      .refreshUsageLimits()
      .catch((): CodexUsageLimitsStreamPayload | null => null);
    if (!payload) {
      return;
    }
    params.broadcast({
      providerScopeKey: payload.providerScopeKey,
      usageLimits: payload.usageLimits,
      data: payload.data,
      uuid: `${crypto.randomUUID()}::usage_limits`,
      timestamp: new Date().toISOString(),
    });
  }
}
