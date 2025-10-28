import type { ModuleReporter } from "../types";

export class GeminiSessionLogger {
  private readonly reporter?: ModuleReporter;

  constructor(reporter?: ModuleReporter) {
    this.reporter = reporter;
  }

  start(sessionId: string): void {
    this.reporter?.info?.("Gemini session started", { sessionId });
  }

  logEvent(event: Record<string, unknown>): void {
    this.reporter?.info?.("Gemini session event", event);
  }

  logUserInput(payload: Record<string, unknown>): void {
    this.reporter?.info?.("Gemini user input", payload);
  }

  logCliOutput(payload: Record<string, unknown>): void {
    this.reporter?.info?.("Gemini CLI output", payload);
  }

  logError(payload: Record<string, unknown>): void {
    this.reporter?.error?.(
      "Gemini session error",
      payload.error instanceof Error
        ? payload.error
        : new Error(String(payload.error ?? "unknown")),
      payload
    );
  }

  end(): void {
    this.reporter?.info?.("Gemini session ended");
  }
}
