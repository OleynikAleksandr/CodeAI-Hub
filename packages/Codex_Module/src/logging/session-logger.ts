import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { SessionLogger } from "../session/types";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "codex");
const FILE_PREFIX = "sdk-codex";
const PROVISIONAL_PREFIXES = ["codex_"];
const DIAGNOSTIC_ONLY_MODE = "sdk_diagnostics_only";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const sanitizeItemPayload = (payload: unknown): unknown => {
  if (!(isRecord(payload) && isRecord(payload.item))) {
    return payload;
  }
  const item = payload.item;
  return {
    type: readString(payload.type) ?? "sdk:item",
    item: {
      id: readString(item.id),
      type: readString(item.type),
      phase: readString(item.phase),
      status: readString(item.status),
      command: readString(item.command),
      aggregatedOutputLength:
        readString(item.aggregated_output)?.length ??
        readNumber(item.output_length),
      textLength: readString(item.text)?.length,
    },
  };
};

const sanitizeDiagnosticPayload = (
  scope: string,
  payload: unknown
): unknown => {
  if (scope.startsWith("item.")) {
    return sanitizeItemPayload(payload);
  }
  return payload;
};

export class CodexSessionLogger implements SessionLogger {
  private readonly buffer: unknown[] = [];
  private logFilePath: string | null = null;
  private writeQueue = Promise.resolve();
  private committedSessionId: string | null = null;
  private currentSessionId: string | null = null;
  private fileReady = false;

  start(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.buffer.length = 0;
    this.fileReady = false;
    this.committedSessionId = null;
    this.logFilePath = null;
    this.writeQueue = Promise.resolve();
    this.queueEntry({
      type: "session_start",
      mode: DIAGNOSTIC_ONLY_MODE,
      sessionId,
      timestamp: Date.now(),
    });
    if (!this.isProvisional(sessionId)) {
      this.commitSession(sessionId);
    }
  }

  end(): void {
    if (!this.committedSessionId) {
      if (this.currentSessionId && !this.isProvisional(this.currentSessionId)) {
        this.commitSession(this.currentSessionId);
      } else {
        this.buffer.length = 0;
        this.currentSessionId = null;
        return;
      }
    }
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
      this.queueEntry({
        type: "session_promoted",
        oldId,
        newId,
        timestamp: Date.now(),
      });
    }
    this.commitSession(newId);
  }

  logUserInput(content: string): void {
    this.queueEntry({
      type: "user_input_meta",
      contentLength: content.length,
      timestamp: Date.now(),
    });
  }

  logSDKEvent(scope: string, payload: unknown): void {
    this.queueEntry({
      type: `sdk:${scope}`,
      payload: sanitizeDiagnosticPayload(scope, payload),
      timestamp: Date.now(),
    });
  }

  private isProvisional(sessionId: string): boolean {
    return PROVISIONAL_PREFIXES.some((prefix) => sessionId.startsWith(prefix));
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
      .then(() => fs.appendFile(filePath, "", "utf8"))
      .then(() => {
        this.fileReady = true;
        this.flushBuffer();
      })
      .catch(() => {
        /* ignore log initialization errors */
      });
  }

  private buildLogFilePath(sessionId: string): string {
    const safeId = sessionId.replace(/[^a-zA-Z0-9]/gu, "-");
    return path.join(LOG_ROOT, `${FILE_PREFIX}-${safeId}.jsonl`);
  }

  private queueEntry(entry: unknown): void {
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
