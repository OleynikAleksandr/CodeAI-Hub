import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { ModuleReporter } from "../types";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "gemini");
const FILE_PREFIX = "gemini";

type LogEntry =
  | {
      readonly type: "session_start";
      readonly sessionId: string;
      readonly timestamp: number;
    }
  | { readonly type: "session_end"; readonly timestamp: number }
  | {
      readonly type: "session_promoted";
      readonly oldId: string;
      readonly newId: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "user_input";
      readonly payload: Record<string, unknown>;
      readonly timestamp: number;
    }
  | {
      readonly type: "event";
      readonly payload: Record<string, unknown>;
      readonly timestamp: number;
    }
  | {
      readonly type: "cli_output";
      readonly payload: Record<string, unknown>;
      readonly timestamp: number;
    }
  | {
      readonly type: "error";
      readonly payload: Record<string, unknown>;
      readonly timestamp: number;
    }
  | {
      readonly type: "raw_event";
      readonly payload: unknown;
      readonly timestamp: number;
    };

const serializeError = (candidate: unknown): Record<string, unknown> => {
  if (candidate instanceof Error) {
    return {
      name: candidate.name,
      message: candidate.message,
      stack: candidate.stack,
    };
  }
  if (!candidate || typeof candidate !== "object") {
    return { message: String(candidate) };
  }
  return candidate as Record<string, unknown>;
};

export class GeminiSessionLogger {
  private readonly reporter?: ModuleReporter;
  private readonly buffer: LogEntry[] = [];
  private logFilePath: string | null = null;
  private writeQueue = Promise.resolve();
  private committedSessionId: string | null = null;
  private currentSessionId: string | null = null;
  private fileReady = false;

  constructor(reporter?: ModuleReporter) {
    this.reporter = reporter;
  }

  start(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.buffer.length = 0;
    this.fileReady = false;
    this.committedSessionId = null;
    this.logFilePath = null;
    this.writeQueue = Promise.resolve();
    this.reporter?.info?.("Gemini session started", { sessionId });
    this.queueEntry({
      type: "session_start",
      sessionId,
      timestamp: Date.now(),
    });
  }

  end(): void {
    if (!this.committedSessionId) {
      if (this.currentSessionId) {
        this.commitSession(this.currentSessionId);
      } else {
        this.buffer.length = 0;
        return;
      }
    }
    this.reporter?.info?.("Gemini session ended");
    this.queueEntry({ type: "session_end", timestamp: Date.now() });
    this.flushBuffer();
    this.currentSessionId = null;
  }

  renameSession(oldId: string, newId: string): void {
    if (!newId) {
      return;
    }
    this.currentSessionId = newId;
    if (oldId && oldId !== newId) {
      this.reporter?.info?.("Gemini session promoted", {
        previousSessionId: oldId,
        sessionId: newId,
      });
      this.queueEntry({
        type: "session_promoted",
        oldId,
        newId,
        timestamp: Date.now(),
      });
    }
    this.commitSession(newId);
  }

  logEvent(event: Record<string, unknown>): void {
    this.reporter?.info?.("Gemini session event", event);
    this.queueEntry({
      type: "event",
      payload: event,
      timestamp: Date.now(),
    });
  }

  logRawEvent(event: unknown): void {
    this.queueEntry({
      type: "raw_event",
      payload: event,
      timestamp: Date.now(),
    });
  }

  logUserInput(payload: Record<string, unknown>): void {
    this.reporter?.info?.("Gemini user input", payload);
    this.queueEntry({
      type: "user_input",
      payload,
      timestamp: Date.now(),
    });
  }

  logCliOutput(payload: Record<string, unknown>): void {
    this.reporter?.info?.("Gemini CLI output", payload);
    this.queueEntry({
      type: "cli_output",
      payload,
      timestamp: Date.now(),
    });
  }

  logError(payload: Record<string, unknown>): void {
    const normalized = {
      ...payload,
      error: serializeError(payload.error),
    };
    const errorObject =
      payload.error instanceof Error
        ? payload.error
        : new Error(String(payload.error ?? "unknown"));
    this.reporter?.error?.("Gemini session error", errorObject, payload);
    this.queueEntry({
      type: "error",
      payload: normalized,
      timestamp: Date.now(),
    });
  }

  private commitSession(sessionId: string): void {
    if (!sessionId) {
      return;
    }
    if (this.committedSessionId === sessionId && this.fileReady) {
      this.flushBuffer();
      return;
    }
    this.committedSessionId = sessionId;
    const filePath = this.buildLogFilePath(sessionId);
    this.logFilePath = filePath;
    this.fileReady = false;
    fs.mkdir(LOG_ROOT, { recursive: true })
      .then(() => fs.writeFile(filePath, "", { flag: "w" }))
      .then(() => {
        this.fileReady = true;
        this.flushBuffer();
      })
      .catch(() => {
        /* ignore log initialization errors */
      });
  }

  private buildLogFilePath(sessionId: string): string {
    const safeId = sessionId.replace(/[^a-zA-Z0-9]/g, "-");
    return path.join(LOG_ROOT, `${FILE_PREFIX}-${safeId}.jsonl`);
  }

  private queueEntry(entry: LogEntry): void {
    if (!(this.fileReady && this.logFilePath)) {
      this.buffer.push(entry);
      return;
    }
    if (this.buffer.length > 0) {
      this.flushBuffer();
    }
    this.enqueueWrite(`${JSON.stringify(entry)}\n`);
  }

  private flushBuffer(): void {
    if (!(this.fileReady && this.logFilePath) || this.buffer.length === 0) {
      return;
    }
    const chunk = this.buffer
      .splice(0, this.buffer.length)
      .map((entry) => JSON.stringify(entry))
      .join("\n");
    if (chunk.length === 0) {
      return;
    }
    this.enqueueWrite(`${chunk}\n`);
  }

  private enqueueWrite(payload: string): void {
    if (!this.logFilePath) {
      return;
    }
    this.writeQueue = this.writeQueue
      .then(() => fs.appendFile(this.logFilePath as string, payload, "utf8"))
      .catch(() => {
        /* ignore log append errors */
      });
  }
}
