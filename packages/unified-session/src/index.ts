import type { FileHandle } from "node:fs/promises";
import { mkdir, open, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const SESSION_FILE_EXTENSION = ".jsonl";
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;
const MULTIPLE_DASHES_REGEX = /-+/g;
const TRAILING_DASH_REGEX = /-$/;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = { readonly [key: string]: JsonValue };

export type MessageRole = "user" | "assistant" | "thinking" | "system";

export type SessionRecord =
  | SessionOpenRecord
  | SessionCloseRecord
  | SessionMessageRecord;

export type SessionOpenRecord = {
  readonly type: "session-open";
  readonly timestamp: string;
  readonly provider: string;
  readonly workspaceSlug: string;
  readonly sessionId: string;
  readonly metadata?: JsonObject;
};

export type SessionCloseRecord = {
  readonly type: "session-close";
  readonly timestamp: string;
  readonly provider: string;
  readonly workspaceSlug: string;
  readonly sessionId: string;
  readonly reason?: string;
  readonly metadata?: JsonObject;
};

export type SessionMessageRecord = {
  readonly type: "message";
  readonly timestamp: string;
  readonly provider: string;
  readonly workspaceSlug: string;
  readonly sessionId: string;
  readonly messageId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly metadata?: JsonObject;
};

export type SessionWriterOptions = {
  readonly rootDirectory: string;
  readonly workspaceSlug: string;
  readonly provider: string;
  readonly sessionId: string;
  readonly metadata?: JsonObject;
};

export type AppendMessageOptions = {
  readonly messageId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly timestamp?: string;
  readonly metadata?: JsonObject;
};

export type CloseSessionOptions = {
  readonly timestamp?: string;
  readonly reason?: string;
  readonly metadata?: JsonObject;
};

type InternalRecord = SessionRecord;

type NormalizedMetadata = JsonObject | undefined;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
};

export const toJsonValue = (value: unknown): JsonValue | undefined => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const result: JsonValue[] = [];
    for (const item of value) {
      const normalized = toJsonValue(item);
      if (normalized === undefined) {
        return;
      }
      result.push(normalized);
    }
    return result;
  }

  if (isPlainObject(value)) {
    return toJsonObject(value);
  }

  return;
};

export const toJsonObject = (
  value: Record<string, unknown>
): JsonObject | undefined => {
  const result: Record<string, JsonValue> = {};
  for (const [key, candidate] of Object.entries(value)) {
    const normalized = toJsonValue(candidate);
    if (normalized === undefined) {
      return;
    }
    result[key] = normalized;
  }
  return result;
};

const normalizeMetadata = (
  value: JsonObject | undefined
): NormalizedMetadata => {
  if (value === undefined) {
    return;
  }
  if (!isPlainObject(value)) {
    return;
  }
  return toJsonObject(value as Record<string, unknown>) ?? undefined;
};

export const sanitizeWorkspaceSlug = (input: string): string => {
  const normalized = input
    .replace(NON_ALPHANUMERIC_REGEX, "-")
    .replace(MULTIPLE_DASHES_REGEX, "-")
    .replace(TRAILING_DASH_REGEX, "")
    .trim();
  return normalized.length > 0 ? normalized : "default-workspace";
};

export const buildSessionDirectoryPath = (
  rootDirectory: string,
  workspaceSlug: string,
  provider: string
): string => resolve(rootDirectory, workspaceSlug, provider);

export const buildSessionFilePath = (options: SessionWriterOptions): string =>
  join(
    buildSessionDirectoryPath(
      options.rootDirectory,
      options.workspaceSlug,
      options.provider
    ),
    `${options.sessionId}${SESSION_FILE_EXTENSION}`
  );

export const createSessionOpenRecord = (
  options: SessionWriterOptions,
  timestamp = new Date().toISOString()
): SessionOpenRecord => ({
  type: "session-open",
  timestamp,
  provider: options.provider,
  workspaceSlug: options.workspaceSlug,
  sessionId: options.sessionId,
  metadata: options.metadata,
});

export const createSessionCloseRecord = (
  options: SessionWriterOptions,
  overrides?: CloseSessionOptions
): SessionCloseRecord => ({
  type: "session-close",
  timestamp: overrides?.timestamp ?? new Date().toISOString(),
  provider: options.provider,
  workspaceSlug: options.workspaceSlug,
  sessionId: options.sessionId,
  reason: overrides?.reason,
  metadata: overrides?.metadata,
});

const createMessageRecord = (
  writerOptions: SessionWriterOptions,
  message: AppendMessageOptions
): SessionMessageRecord => ({
  type: "message",
  timestamp: message.timestamp ?? new Date().toISOString(),
  provider: writerOptions.provider,
  workspaceSlug: writerOptions.workspaceSlug,
  sessionId: writerOptions.sessionId,
  messageId: message.messageId,
  role: message.role,
  content: message.content,
  metadata: normalizeMetadata(message.metadata),
});

export class UnifiedSessionWriter {
  private readonly options: SessionWriterOptions;

  private readonly filePath: string;

  private readonly directoryPath: string;

  private queue: Promise<void>;

  private handle: FileHandle | null = null;

  private closed = false;

  constructor(options: SessionWriterOptions) {
    this.options = options;
    this.filePath = buildSessionFilePath(options);
    this.directoryPath = buildSessionDirectoryPath(
      options.rootDirectory,
      options.workspaceSlug,
      options.provider
    );
    this.queue = this.initialize();
  }

  append(record: InternalRecord, flush = false): Promise<void> {
    if (this.closed) {
      throw new Error(
        `Cannot append to closed writer for ${this.options.provider} session ${this.options.sessionId}`
      );
    }
    const normalized: InternalRecord = {
      ...record,
      metadata: normalizeMetadata(record.metadata),
    } as InternalRecord;
    return this.enqueue(async (handle) => {
      await this.writeRecord(handle, normalized);
      if (flush) {
        await handle.sync();
      }
    });
  }

  appendMessage(message: AppendMessageOptions, flush = false): Promise<void> {
    return this.append(createMessageRecord(this.options, message), flush);
  }

  close(options?: CloseSessionOptions): Promise<void> {
    if (this.closed) {
      return this.queue;
    }
    this.closed = true;
    const record = createSessionCloseRecord(this.options, options);
    return this.enqueue(async (handle) => {
      await this.writeRecord(handle, record);
      await handle.sync();
      await handle.close();
      this.handle = null;
    });
  }

  private async initialize(): Promise<void> {
    await mkdir(this.directoryPath, { recursive: true });
    const handle = await open(this.filePath, "a");
    this.handle = handle;
    const stats = await handle.stat();
    if (stats.size === 0) {
      await this.writeRecord(handle, createSessionOpenRecord(this.options));
      await handle.sync();
    }
  }

  private enqueue(task: (handle: FileHandle) => Promise<void>): Promise<void> {
    this.queue = this.queue.then(async () => {
      const handle = this.ensureHandle();
      await task(handle);
    });
    return this.queue;
  }

  private ensureHandle(): FileHandle {
    if (!this.handle) {
      throw new Error(
        `UnifiedSessionWriter not initialized for ${this.options.provider} session ${this.options.sessionId}`
      );
    }
    return this.handle;
  }

  private async writeRecord(
    handle: FileHandle,
    record: InternalRecord
  ): Promise<void> {
    const line = `${JSON.stringify(record)}\n`;
    await handle.appendFile(line, "utf8");
  }
}

export const readSessionEvents = async (
  filePath: string
): Promise<SessionRecord[]> => {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const events: SessionRecord[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed) as SessionRecord;
      events.push(parsed);
    } catch {
      // Ignore malformed lines; partial writes will be ignored on read.
    }
  }
  return events;
};
