import type { ActiveSession } from "../session/types";
import type { ModuleReporter } from "../types";

const MAX_RECURSION_DEPTH = 6;

type GeminiMessageProcessorOptions = {
  readonly reporter?: ModuleReporter;
};

export class GeminiMessageProcessor {
  private readonly reporter?: ModuleReporter;

  constructor(options?: GeminiMessageProcessorOptions) {
    this.reporter = options?.reporter;
  }

  handleStdout(session: ActiveSession, chunk: Buffer): void {
    session.stdoutBuffer += chunk.toString("utf8");
    let newlineIndex = session.stdoutBuffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const raw = session.stdoutBuffer.slice(0, newlineIndex).trim();
      session.stdoutBuffer = session.stdoutBuffer.slice(newlineIndex + 1);
      if (raw.length > 0) {
        this.processLine(session, raw);
      }
      newlineIndex = session.stdoutBuffer.indexOf("\n");
    }
  }

  handleProcessExit(
    session: ActiveSession,
    details: { code: number | null; signal: NodeJS.Signals | null }
  ): void {
    if (session.stdoutBuffer.trim().length > 0) {
      this.processLine(session, session.stdoutBuffer.trim());
      session.stdoutBuffer = "";
    }
    session.logger?.logEvent({ type: "gemini_exit", details });
  }

  private processLine(session: ActiveSession, raw: string): void {
    try {
      const parsed = JSON.parse(raw) as unknown;
      session.logger?.logCliOutput?.({ stream: "stdout", raw });
      this.emitAssistantEvent(session, parsed);
    } catch (error) {
      this.reporter?.warn?.("Failed to parse Gemini CLI output", {
        sessionId: session.sessionId,
        raw,
      });
      session.logger?.logError?.({ error, raw, stage: "parse" });
      session.eventEmitter.emit("error", {
        type: "parse_error",
        provider: "gemini",
        payload: {
          raw,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private emitAssistantEvent(session: ActiveSession, payload: unknown): void {
    const content = this.extractText(payload);
    session.logger?.logEvent({ direction: "incoming", content });
    session.eventEmitter.emit("message", {
      type: "assistant",
      provider: "gemini",
      content,
      data: payload,
    });
  }

  private extractText(payload: unknown): string {
    const visited = new Set<unknown>();
    const stack: Array<{ value: unknown; depth: number }> = [
      { value: payload, depth: 0 },
    ];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        break;
      }
      const { value, depth } = current;
      if (this.shouldSkipNode(value, depth)) {
        continue;
      }

      const directString = this.tryExtractString(value);
      if (directString) {
        return directString;
      }

      const collectionResult = this.processCollection(
        stack,
        value,
        depth,
        visited
      );
      if (collectionResult.text) {
        return collectionResult.text;
      }
    }

    return this.safeStringify(payload);
  }

  private shouldSkipNode(value: unknown, depth: number): boolean {
    return value === null || depth > MAX_RECURSION_DEPTH;
  }

  private tryExtractString(candidate: unknown): string | null {
    if (typeof candidate !== "string") {
      return null;
    }
    const trimmed = candidate.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private enqueueArrayChildren(
    stack: Array<{ value: unknown; depth: number }>,
    source: readonly unknown[],
    depth: number
  ): void {
    for (let index = source.length - 1; index >= 0; index -= 1) {
      stack.push({ value: source[index], depth: depth + 1 });
    }
  }

  private enqueueObjectChildren(
    stack: Array<{ value: unknown; depth: number }>,
    source: Record<string, unknown>,
    depth: number
  ): void {
    const keys = Object.keys(source);
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      stack.push({ value: source[key], depth: depth + 1 });
    }
  }

  private processCollection(
    stack: Array<{ value: unknown; depth: number }>,
    candidate: unknown,
    depth: number,
    visited: Set<unknown>
  ): { readonly handled: boolean; readonly text?: string } {
    if (Array.isArray(candidate)) {
      this.enqueueArrayChildren(stack, candidate, depth);
      return { handled: true };
    }

    if (typeof candidate !== "object" || candidate === null) {
      return { handled: false };
    }

    if (visited.has(candidate)) {
      return { handled: true };
    }
    visited.add(candidate);

    const record = candidate as Record<string, unknown>;
    const textFromFields = this.pickTextField(record);
    if (textFromFields) {
      return { handled: true, text: textFromFields };
    }
    this.enqueueObjectChildren(stack, record, depth);
    return { handled: true };
  }

  private pickTextField(candidate: Record<string, unknown>): string | null {
    const textLikeKeys = ["text", "content", "message", "output"];
    for (const key of textLikeKeys) {
      const value = candidate[key];
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
    return null;
  }

  private safeStringify(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  }
}
