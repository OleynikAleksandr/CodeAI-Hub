import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "codex");
const FILE_PREFIX = "sdk-codex-app-server-process";
const THREAD_FILE_PREFIX = "sdk-codex-thread";

const sanitizeTimestamp = (value: string): string =>
  value.replace(/[:.]/gu, "-");

const toIsoTimestamp = (): string => new Date().toISOString();

const sanitizeFileSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/gu, "-").slice(0, 96);

const buildLogFilePath = (): string =>
  path.join(
    LOG_ROOT,
    `${FILE_PREFIX}-${sanitizeTimestamp(toIsoTimestamp())}-${randomUUID()}.jsonl`
  );

const buildThreadLogFilePath = (threadId: string): string =>
  path.join(
    LOG_ROOT,
    `${THREAD_FILE_PREFIX}-${sanitizeFileSegment(threadId)}-${sanitizeTimestamp(toIsoTimestamp())}-${randomUUID()}.jsonl`
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const getParams = (payload: unknown): Record<string, unknown> | null => {
  if (!isRecord(payload)) {
    return null;
  }
  return isRecord(payload.params) ? payload.params : null;
};

const getRequestId = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    return null;
  }
  return asString(payload.id);
};

const getMethod = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    return null;
  }
  return asString(payload.method);
};

const getThreadIdFromParams = (payload: unknown): string | null => {
  const params = getParams(payload);
  return params ? asString(params.threadId) : null;
};

const getThreadIdFromResponse = (payload: unknown): string | null => {
  if (!(isRecord(payload) && isRecord(payload.result))) {
    return null;
  }
  const thread = payload.result.thread;
  return isRecord(thread) ? asString(thread.id) : null;
};

interface ThreadLogState {
  readonly buffer: string[];
  readonly filePath: string;
  fileReady: boolean;
  readonly threadId: string;
  writeQueue: Promise<void>;
}

export class CodexAppServerSessionLogger {
  private readonly buffer: string[] = [];
  private filePath: string | null = null;
  private fileReady = false;
  private readonly pendingRequestThreadIds = new Map<string, string>();
  private readonly pendingThreadStartEntries = new Map<string, unknown>();
  private providerCodexHome: string | null = null;
  private readonly threadLogs = new Map<string, ThreadLogState>();
  private writeQueue = Promise.resolve();

  start(payload: { readonly providerCodexHome: string }): void {
    this.filePath = buildLogFilePath();
    this.fileReady = false;
    this.buffer.length = 0;
    this.pendingRequestThreadIds.clear();
    this.pendingThreadStartEntries.clear();
    this.providerCodexHome = payload.providerCodexHome;
    this.threadLogs.clear();
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
    const entry = {
      payload,
      timestamp: toIsoTimestamp(),
      type: "session_end",
    };
    this.enqueueEntry(entry);
    for (const threadId of this.threadLogs.keys()) {
      this.enqueueThreadEntry(threadId, entry);
    }
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
    const entry = {
      method,
      params,
      timestamp: toIsoTimestamp(),
      type: "notification",
    };
    this.enqueueEntry(entry);
    const threadId = isRecord(params) ? asString(params.threadId) : null;
    if (threadId) {
      this.enqueueThreadEntry(threadId, entry);
    }
  }

  logProtocolRecord(record: Record<string, unknown>): void {
    this.enqueueEntry({
      record,
      timestamp: toIsoTimestamp(),
      type: "protocol_log",
    });
  }

  logRequest(payload: unknown): void {
    const entry = {
      payload,
      timestamp: toIsoTimestamp(),
      type: "request",
    };
    this.enqueueEntry(entry);
    const requestId = getRequestId(payload);
    if (!requestId) {
      return;
    }
    const threadId = getThreadIdFromParams(payload);
    if (threadId) {
      this.pendingRequestThreadIds.set(requestId, threadId);
      this.enqueueThreadEntry(threadId, entry);
      return;
    }
    if (getMethod(payload) === "thread/start") {
      this.pendingThreadStartEntries.set(requestId, entry);
    }
  }

  logResponse(payload: unknown): void {
    const entry = {
      payload,
      timestamp: toIsoTimestamp(),
      type: "response",
    };
    this.enqueueEntry(entry);
    const responseId = getRequestId(payload);
    if (!responseId) {
      return;
    }
    const pendingThreadId = this.pendingRequestThreadIds.get(responseId);
    if (pendingThreadId) {
      this.pendingRequestThreadIds.delete(responseId);
      this.enqueueThreadEntry(
        getThreadIdFromResponse(payload) ?? pendingThreadId,
        entry
      );
      return;
    }
    const threadStartEntry = this.pendingThreadStartEntries.get(responseId);
    if (!threadStartEntry) {
      return;
    }
    this.pendingThreadStartEntries.delete(responseId);
    const threadId = getThreadIdFromResponse(payload);
    if (!threadId) {
      return;
    }
    this.enqueueThreadEntry(threadId, threadStartEntry);
    this.enqueueThreadEntry(threadId, entry);
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

  private ensureThreadLog(threadId: string): ThreadLogState {
    const existing = this.threadLogs.get(threadId);
    if (existing) {
      return existing;
    }
    const state: ThreadLogState = {
      buffer: [],
      filePath: buildThreadLogFilePath(threadId),
      fileReady: false,
      threadId,
      writeQueue: Promise.resolve(),
    };
    this.threadLogs.set(threadId, state);
    this.enqueueThreadEntry(threadId, {
      payload: {
        parentLogFile: this.filePath,
        providerCodexHome: this.providerCodexHome,
        threadId,
      },
      timestamp: toIsoTimestamp(),
      type: "thread_log_start",
    });
    mkdir(LOG_ROOT, { recursive: true })
      .then(async () => {
        await appendFile(state.filePath, "", "utf8");
        state.fileReady = true;
        this.flushThreadBuffer(state);
      })
      .catch(() => {
        /* ignore thread logger bootstrap failures */
      });
    return state;
  }

  private enqueueThreadEntry(threadId: string, entry: unknown): void {
    const state = this.ensureThreadLog(threadId);
    const serialized = `${JSON.stringify(entry)}\n`;
    if (!state.fileReady) {
      state.buffer.push(serialized);
      return;
    }
    if (state.buffer.length > 0) {
      this.flushThreadBuffer(state);
    }
    this.enqueueThreadWrite(state, serialized);
  }

  private flushThreadBuffer(state: ThreadLogState): void {
    if (!state.fileReady || state.buffer.length === 0) {
      return;
    }
    const payload = state.buffer.join("");
    state.buffer.length = 0;
    this.enqueueThreadWrite(state, payload);
  }

  private enqueueThreadWrite(state: ThreadLogState, payload: string): void {
    state.writeQueue = state.writeQueue
      .then(() => appendFile(state.filePath, payload, "utf8"))
      .catch(() => {
        /* ignore thread logger write failures */
      });
  }
}
