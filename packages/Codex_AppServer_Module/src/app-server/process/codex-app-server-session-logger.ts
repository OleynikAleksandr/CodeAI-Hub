import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "codex");
const FILE_PREFIX = "sdk-codex-app-server";

const sanitizeTimestamp = (value: string): string =>
  value.replace(/[:.]/gu, "-");

const toIsoTimestamp = (): string => new Date().toISOString();

const buildLogFilePath = (): string =>
  path.join(
    LOG_ROOT,
    `${FILE_PREFIX}-${sanitizeTimestamp(toIsoTimestamp())}-${randomUUID()}.jsonl`
  );

export class CodexAppServerSessionLogger {
  private readonly buffer: string[] = [];
  private filePath: string | null = null;
  private fileReady = false;
  private writeQueue = Promise.resolve();

  start(payload: { readonly providerCodexHome: string }): void {
    this.filePath = buildLogFilePath();
    this.fileReady = false;
    this.buffer.length = 0;
    this.writeQueue = Promise.resolve();
    this.enqueueEntry({
      payload,
      timestamp: toIsoTimestamp(),
      type: "session_start",
    });
    mkdir(LOG_ROOT, { recursive: true })
      .then(async () => {
        if (!this.filePath) {
          return;
        }
        await appendFile(this.filePath, "", "utf8");
        this.fileReady = true;
        this.flushBuffer();
      })
      .catch(() => {
        /* ignore logger bootstrap failures */
      });
  }

  end(payload: {
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }): void {
    this.enqueueEntry({
      payload,
      timestamp: toIsoTimestamp(),
      type: "session_end",
    });
    this.flushBuffer();
  }

  logLifecycle(type: string, payload?: unknown): void {
    this.enqueueEntry({
      payload,
      timestamp: toIsoTimestamp(),
      type,
    });
  }

  logMalformedStdout(line: string): void {
    this.enqueueEntry({
      line,
      timestamp: toIsoTimestamp(),
      type: "stdout_non_json",
    });
  }

  logNotification(method: string, params: unknown): void {
    this.enqueueEntry({
      method,
      params,
      timestamp: toIsoTimestamp(),
      type: "notification",
    });
  }

  logProtocolRecord(record: Record<string, unknown>): void {
    this.enqueueEntry({
      record,
      timestamp: toIsoTimestamp(),
      type: "protocol_log",
    });
  }

  logRequest(payload: unknown): void {
    this.enqueueEntry({
      payload,
      timestamp: toIsoTimestamp(),
      type: "request",
    });
  }

  logResponse(payload: unknown): void {
    this.enqueueEntry({
      payload,
      timestamp: toIsoTimestamp(),
      type: "response",
    });
  }

  logStderr(message: string): void {
    this.enqueueEntry({
      message,
      timestamp: toIsoTimestamp(),
      type: "stderr",
    });
  }

  private enqueueEntry(entry: unknown): void {
    const serialized = `${JSON.stringify(entry)}\n`;
    if (!(this.fileReady && this.filePath)) {
      this.buffer.push(serialized);
      return;
    }
    if (this.buffer.length > 0) {
      this.flushBuffer();
    }
    this.enqueueWrite(serialized);
  }

  private flushBuffer(): void {
    if (!(this.fileReady && this.filePath) || this.buffer.length === 0) {
      return;
    }
    const payload = this.buffer.join("");
    this.buffer.length = 0;
    this.enqueueWrite(payload);
  }

  private enqueueWrite(payload: string): void {
    const filePath = this.filePath;
    if (!filePath) {
      return;
    }
    this.writeQueue = this.writeQueue
      .then(() => appendFile(filePath, payload, "utf8"))
      .catch(() => {
        /* ignore logger write failures */
      });
  }
}
