import type { CodexModuleOptions, CodexTurnOptions } from "../types";

const SCAFFOLD_ERROR_MESSAGE =
  "Codex app-server adapter scaffold is not implemented yet.";

export class CodexProviderAdapter {
  private readonly options: CodexModuleOptions;

  constructor(options: CodexModuleOptions) {
    this.options = options;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  createSession(_workspacePath?: string): Promise<string> {
    return Promise.reject(new Error(SCAFFOLD_ERROR_MESSAGE));
  }

  resumeSession(_sessionId: string, _workspacePath?: string): Promise<string> {
    return Promise.reject(new Error(SCAFFOLD_ERROR_MESSAGE));
  }

  closeSession(_sessionId: string): Promise<void> {
    return Promise.resolve();
  }

  sendMessage(
    _sessionId: string,
    _content: string,
    _turnOptions?: CodexTurnOptions
  ): Promise<void> {
    return Promise.reject(new Error(SCAFFOLD_ERROR_MESSAGE));
  }

  subscribe(
    _sessionId: string,
    _listener: (payload: unknown) => void
  ): () => void {
    const reporter = this.options.reporter;
    return () => reporter?.info?.("Codex app-server scaffold unsubscribe noop");
  }
}
