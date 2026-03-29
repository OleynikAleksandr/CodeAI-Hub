import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { SessionLogger } from "../session/types";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "codex");
const FILE_PREFIX = "sdk-codex";
const PROVISIONAL_PREFIXES = ["codex_"];

export class CodexSessionLogger implements SessionLogger {
  private static readonly liveLoggers = new Map<string, CodexSessionLogger>();
  private static readonly pendingProviderFeedback = new Map<
    string,
    unknown[]
  >();
  private readonly buffer: unknown[] = [];
  private logFilePath: string | null = null;
  private writeQueue = Promise.resolve();
  private committedSessionId: string | null = null;
  private currentSessionId: string | null = null;
  private fileReady = false;

  static logProviderFeedback(sessionId: string, payload: unknown): void {
    const normalizedSessionId = sessionId.trim();
    if (!normalizedSessionId) {
      return;
    }
    const entry = {
      type: "provider_feedback",
      payload,
      timestamp: Date.now(),
    };
    const logger = CodexSessionLogger.liveLoggers.get(normalizedSessionId);
    if (logger) {
      logger.queueEntry(entry);
      return;
    }

    const pending =
      CodexSessionLogger.pendingProviderFeedback.get(normalizedSessionId) ?? [];
    pending.push(entry);
    CodexSessionLogger.pendingProviderFeedback.set(
      normalizedSessionId,
      pending
    );
  }

  start(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.buffer.length = 0;
    this.fileReady = false;
    this.committedSessionId = null;
    this.logFilePath = null;
    this.writeQueue = Promise.resolve();
    this.queueEntry({
      type: "session_start",
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
        this.unregisterLiveLogger(this.currentSessionId);
        this.currentSessionId = null;
        return;
      }
    }
    this.queueEntry({ type: "session_end", timestamp: Date.now() });
    this.flushBuffer();
    this.unregisterLiveLogger(this.currentSessionId);
    this.unregisterLiveLogger(this.committedSessionId);
    this.currentSessionId = null;
  }

  renameSession(oldId: string, newId: string): void {
    if (!newId) {
      return;
    }
    this.unregisterLiveLogger(oldId);
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
    this.queueEntry({ type: "user_input", content, timestamp: Date.now() });
  }

  logSDKEvent(scope: string, payload: unknown): void {
    this.queueEntry({ type: `sdk:${scope}`, payload, timestamp: Date.now() });
  }

  private isProvisional(sessionId: string): boolean {
    return PROVISIONAL_PREFIXES.some((prefix) => sessionId.startsWith(prefix));
  }

  private commitSession(sessionId: string): void {
    if (!sessionId) {
      return;
    }
    if (this.committedSessionId === sessionId && this.fileReady) {
      this.flushPendingProviderFeedback(sessionId);
      this.flushBuffer();
      return;
    }
    this.unregisterLiveLogger(this.committedSessionId);
    this.committedSessionId = sessionId;
    const filePath = this.buildLogFilePath(sessionId);
    this.logFilePath = filePath;
    this.fileReady = false;
    fs.mkdir(LOG_ROOT, { recursive: true })
      .then(() => fs.appendFile(filePath, "", "utf8"))
      .then(() => {
        this.fileReady = true;
        CodexSessionLogger.liveLoggers.set(sessionId, this);
        this.flushPendingProviderFeedback(sessionId);
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

  private flushPendingProviderFeedback(sessionId: string): void {
    const pending =
      CodexSessionLogger.pendingProviderFeedback.get(sessionId) ?? [];
    if (pending.length === 0) {
      return;
    }
    this.buffer.push(...pending);
    CodexSessionLogger.pendingProviderFeedback.delete(sessionId);
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

  private unregisterLiveLogger(sessionId: string | null): void {
    if (!sessionId) {
      return;
    }
    if (CodexSessionLogger.liveLoggers.get(sessionId) === this) {
      CodexSessionLogger.liveLoggers.delete(sessionId);
    }
  }
}
