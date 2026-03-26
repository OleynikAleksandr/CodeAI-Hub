import type { FileHandle } from "node:fs/promises";
import { mkdir, open, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const SESSION_FILE_EXTENSION = ".jsonl";
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;
const MULTIPLE_DASHES_REGEX = /-+/g;
const TRAILING_DASH_REGEX = /-$/;

export type MessageRole = "user" | "assistant" | "thinking" | "system";

export type SessionRecord =
  | SessionOpenRecord
  | SessionCloseRecord
  | SessionMessageRecord;

export type SessionOpenRecord = {
  readonly type: "session-open";
  readonly timestamp: string;
  readonly provider: string;
  readonly sessionId: string;
};

export type SessionCloseRecord = {
  readonly type: "session-close";
  readonly timestamp: string;
  readonly provider: string;
  readonly sessionId: string;
  readonly reason?: string;
};

export type SessionMessageRecord = {
  readonly type: "message";
  readonly timestamp: string;
  readonly provider: string;
  readonly messageId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly tag?: string;
};

export type SessionWriterOptions = {
  readonly rootDirectory: string;
  readonly workspaceSlug: string;
  readonly provider: string;
  readonly sessionId: string;
};

export type AppendMessageOptions = {
  readonly messageId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly timestamp?: string;
  readonly tag?: string;
};

export type CloseSessionOptions = {
  readonly timestamp?: string;
  readonly reason?: string;
};

type InternalRecord = SessionRecord;

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
  sessionId: options.sessionId,
});

export const createSessionCloseRecord = (
  options: SessionWriterOptions,
  overrides?: CloseSessionOptions
): SessionCloseRecord => ({
  type: "session-close",
  timestamp: overrides?.timestamp ?? new Date().toISOString(),
  provider: options.provider,
  sessionId: options.sessionId,
  reason: overrides?.reason,
});

const createMessageRecord = (
  writerOptions: SessionWriterOptions,
  message: AppendMessageOptions
): SessionMessageRecord => ({
  type: "message",
  timestamp: message.timestamp ?? new Date().toISOString(),
  provider: writerOptions.provider,
  messageId: message.messageId,
  role: message.role,
  content: message.content,
  ...(message.tag ? { tag: message.tag } : {}),
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
    return this.enqueue(async (handle) => {
      await this.writeRecord(handle, record);
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
