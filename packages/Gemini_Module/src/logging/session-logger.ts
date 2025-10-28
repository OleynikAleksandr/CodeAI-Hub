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

  end(): void {
    this.reporter?.info?.("Gemini session ended");
  }
}
