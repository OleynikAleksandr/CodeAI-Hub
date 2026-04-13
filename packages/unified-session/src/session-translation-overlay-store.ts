import type { FileHandle } from "node:fs/promises";
import { mkdir, open, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const TRANSLATION_FILE_EXTENSION = ".translations.jsonl";

export interface SessionTranslationOverlayWriterOptions {
  readonly provider: string;
  readonly rootDirectory: string;
  readonly sessionId: string;
  readonly workspaceSlug: string;
}

export interface SessionMessageTranslationRecord {
  readonly messageId: string;
  readonly sourceHash: string;
  readonly targetLanguage: string;
  readonly timestamp: string;
  readonly translatedContent: string;
  readonly type: "message-translation";
}

export interface AppendMessageTranslationOptions {
  readonly messageId: string;
  readonly sourceHash: string;
  readonly targetLanguage: string;
  readonly timestamp?: string;
  readonly translatedContent: string;
}

const buildSessionTranslationDirectoryPath = (
  rootDirectory: string,
  workspaceSlug: string,
  provider: string
): string => resolve(rootDirectory, workspaceSlug, provider);

export const buildSessionTranslationFilePath = (
  options: SessionTranslationOverlayWriterOptions
): string =>
  join(
    buildSessionTranslationDirectoryPath(
      options.rootDirectory,
      options.workspaceSlug,
      options.provider
    ),
    `${options.sessionId}${TRANSLATION_FILE_EXTENSION}`
  );

const createMessageTranslationRecord = (
  options: AppendMessageTranslationOptions
): SessionMessageTranslationRecord => ({
  type: "message-translation",
  timestamp: options.timestamp ?? new Date().toISOString(),
  messageId: options.messageId,
  sourceHash: options.sourceHash,
  targetLanguage: options.targetLanguage,
  translatedContent: options.translatedContent,
});

export class SessionTranslationOverlayWriter {
  private readonly filePath: string;
  private readonly directoryPath: string;
  private readonly options: SessionTranslationOverlayWriterOptions;

  private queue: Promise<void>;
  private handle: FileHandle | null = null;
  private closed = false;

  constructor(options: SessionTranslationOverlayWriterOptions) {
    this.options = options;
    this.filePath = buildSessionTranslationFilePath(options);
    this.directoryPath = buildSessionTranslationDirectoryPath(
      options.rootDirectory,
      options.workspaceSlug,
      options.provider
    );
    this.queue = this.initialize();
  }

  appendTranslation(
    options: AppendMessageTranslationOptions,
    flush = false
  ): Promise<void> {
    if (this.closed) {
      throw new Error(
        `Cannot append translation to closed overlay writer for ${this.options.provider} session ${this.options.sessionId}`
      );
    }
    const record = createMessageTranslationRecord(options);
    return this.enqueue(async (handle) => {
      await this.writeRecord(handle, record);
      if (flush) {
        await handle.sync();
      }
    });
  }

  close(): Promise<void> {
    if (this.closed) {
      return this.queue;
    }
    this.closed = true;
    return this.enqueue(async (handle) => {
      await handle.sync();
      await handle.close();
      this.handle = null;
    });
  }

  private async initialize(): Promise<void> {
    await mkdir(this.directoryPath, { recursive: true });
    this.handle = await open(this.filePath, "a");
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
        `Translation overlay writer not initialized for ${this.options.provider} session ${this.options.sessionId}`
      );
    }
    return this.handle;
  }

  private async writeRecord(
    handle: FileHandle,
    record: SessionMessageTranslationRecord
  ): Promise<void> {
    const line = `${JSON.stringify(record)}\n`;
    await handle.appendFile(line, "utf8");
  }
}

export const readSessionTranslationOverlayRecords = async (
  filePath: string
): Promise<SessionMessageTranslationRecord[]> => {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const records: SessionMessageTranslationRecord[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed) as SessionMessageTranslationRecord;
      if (parsed.type !== "message-translation") {
        continue;
      }
      records.push(parsed);
    } catch {
      // Ignore malformed lines; partial writes should not fail history reads.
    }
  }
  return records;
};

export const readSessionTranslationOverlayMap = async (
  filePath: string
): Promise<Map<string, SessionMessageTranslationRecord>> => {
  const records = await readSessionTranslationOverlayRecords(filePath);
  const map = new Map<string, SessionMessageTranslationRecord>();
  for (const record of records) {
    map.set(record.messageId, record);
  }
  return map;
};
