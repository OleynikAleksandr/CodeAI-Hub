import { CodexAppServerFacade } from "../app-server/codex-app-server-facade";
import {
  type CodexNativeRequestCaptureOptions,
  CodexNativeRequestCaptureService,
} from "../diagnostics/codex-native-request-capture-service";
import type {
  CodexModuleOptions,
  CodexTurnOptions,
  CodexUsageLimitsStreamPayload,
} from "../types";

export class CodexProviderAdapter {
  readonly usageLimitsFacade?: CodexModuleOptions["usageLimitsFacade"];
  private readonly facade: CodexAppServerFacade;
  private readonly nativeRequestCaptureService: CodexNativeRequestCaptureService;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(options: CodexModuleOptions) {
    this.usageLimitsFacade = options.usageLimitsFacade;
    this.facade = new CodexAppServerFacade(options);
    this.nativeRequestCaptureService = new CodexNativeRequestCaptureService({
      reporter: options.reporter,
      workspace: options.workspace,
    });
  }

  initialize(): Promise<void> {
    return this.facade.initialize();
  }

  createSession(workspacePath?: string): Promise<string> {
    return this.enqueueProviderHomeOperation(() =>
      this.facade.createSession(workspacePath)
    );
  }

  resumeSession(sessionId: string, workspacePath?: string): Promise<string> {
    return this.enqueueProviderHomeOperation(() =>
      this.facade.resumeSession(sessionId, workspacePath)
    );
  }

  closeSession(sessionId: string): Promise<void> {
    return this.facade.closeSession(sessionId);
  }

  captureNativeRequest(
    options: CodexNativeRequestCaptureOptions
  ): Promise<void> {
    return this.enqueueProviderHomeOperation(() =>
      this.nativeRequestCaptureService.captureNativeRequest(options)
    );
  }

  sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: CodexTurnOptions
  ): Promise<void> {
    return this.enqueueProviderHomeOperation(() =>
      this.facade.sendMessage(sessionId, content, turnOptions)
    );
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
    const payload = await this.enqueueProviderHomeOperation(() =>
      this.facade
        .refreshUsageLimits()
        .catch((): CodexUsageLimitsStreamPayload | null => null)
    );
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

  private enqueueProviderHomeOperation<TResult>(
    operation: () => Promise<TResult>
  ): Promise<TResult> {
    const previous = this.operationQueue ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    this.operationQueue = current.then(
      () => undefined,
      () => undefined
    );
    return current;
  }
}
