import { readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_TTL_MS = 500;

type JsonRecord = Record<string, unknown>;

interface JsonSnapshotCacheEntry {
  readonly expiresAtMs: number;
  readonly value: JsonRecord | null;
}

interface JsonFileSnapshotCacheOptions {
  readonly now?: () => number;
  readonly readFile?: (filePath: string) => string;
  readonly ttlMs?: number;
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class JsonFileSnapshotCache {
  private readonly entries = new Map<string, JsonSnapshotCacheEntry>();
  private readonly now: () => number;
  private readonly readFile: (filePath: string) => string;
  private readonly ttlMs: number;

  constructor(options: JsonFileSnapshotCacheOptions = {}) {
    this.now = options.now ?? Date.now;
    this.readFile =
      options.readFile ?? ((filePath) => readFileSync(filePath, "utf8"));
    this.ttlMs = Math.max(0, options.ttlMs ?? DEFAULT_TTL_MS);
  }

  clear(filePath?: string): void {
    if (!filePath) {
      this.entries.clear();
      return;
    }
    this.entries.delete(this.resolveKey(filePath));
  }

  readObject(filePath: string): JsonRecord | null {
    const key = this.resolveKey(filePath);
    const nowMs = this.now();
    const cached = this.entries.get(key);
    if (cached && cached.expiresAtMs > nowMs) {
      return cached.value;
    }

    const value = this.readSnapshot(key);
    this.entries.set(key, {
      expiresAtMs: nowMs + this.ttlMs,
      value,
    });
    return value;
  }

  private readSnapshot(filePath: string): JsonRecord | null {
    try {
      const parsed = JSON.parse(this.readFile(filePath)) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private resolveKey(filePath: string): string {
    return path.resolve(filePath);
  }
}

export const providerSettingsSnapshotCache = new JsonFileSnapshotCache();
