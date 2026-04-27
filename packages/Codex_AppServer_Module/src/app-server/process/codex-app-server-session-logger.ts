const consume = (..._values: readonly unknown[]): void => {
  /* Intentionally empty: Codex app-server SDK transport logging is disabled. */
};

export class CodexAppServerSessionLogger {
  start(payload: { readonly providerCodexHome: string }): void {
    consume(payload);
  }

  end(payload: {
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }): void {
    consume(payload);
  }

  logLifecycle(type: string, payload?: unknown): void {
    consume(type, payload);
  }

  logMalformedStdout(line: string): void {
    consume(line);
  }

  logNotification(method: string, params: unknown): void {
    consume(method, params);
  }

  logProtocolRecord(record: Record<string, unknown>): void {
    consume(record);
  }

  logRequest(payload: unknown): void {
    consume(payload);
  }

  logResponse(payload: unknown): void {
    consume(payload);
  }

  logStderr(message: string): void {
    consume(message);
  }
}
