import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const KIMI_NATIVE_CONTEXT_TOKEN_LIMIT = 262_144;
const JSONL_LINE_BREAK_PATTERN = /\r?\n/;
const PROVIDER_SESSION_ID_PATTERN = /^session_[a-z0-9-]+$/i;

export interface KimiNativeTokenUsageSnapshot {
  readonly limit: number;
  readonly used: number;
}

export interface KimiNativeTokenUsageEventData {
  readonly kind: "token_usage";
  readonly limit: number;
  readonly provider: "kimi";
  readonly providerSessionId: string;
  readonly source: "kimi_native_wire";
  readonly timestamp: string;
  readonly tokenUsage: KimiNativeTokenUsageSnapshot;
  readonly used: number;
}

export interface KimiNativeTokenUsageEvent {
  readonly data: KimiNativeTokenUsageEventData;
  readonly payload: KimiNativeTokenUsageEventData;
  readonly providerSessionId: string;
  readonly type: "stream_event";
}

export interface KimiNativeTokenUsageReaderOptions {
  readonly clock?: () => Date;
  readonly contextTokenLimit?: number;
  readonly sessionsRoot?: string;
}

export class KimiNativeTokenUsageReader {
  private readonly clock: () => Date;
  private readonly contextTokenLimit: number;
  private readonly sessionsRoot: string;

  constructor(options: KimiNativeTokenUsageReaderOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.contextTokenLimit =
      options.contextTokenLimit ?? KIMI_NATIVE_CONTEXT_TOKEN_LIMIT;
    this.sessionsRoot =
      options.sessionsRoot ?? path.join(os.homedir(), ".kimi-code", "sessions");
  }

  async read(
    providerSessionId: string
  ): Promise<KimiNativeTokenUsageSnapshot | null> {
    const sessionId = normalizeProviderSessionId(providerSessionId);
    if (!sessionId) {
      return null;
    }
    const workspaces = await readdir(this.sessionsRoot, {
      withFileTypes: true,
    }).catch(() => []);
    for (const workspace of workspaces) {
      if (!workspace.isDirectory()) {
        continue;
      }
      const wireJsonlPath = path.join(
        this.sessionsRoot,
        workspace.name,
        sessionId,
        "agents",
        "main",
        "wire.jsonl"
      );
      const text = await readFile(wireJsonlPath, "utf8").catch(() => null);
      if (text !== null) {
        return readKimiNativeTokenUsageFromWireJsonl(
          text,
          this.contextTokenLimit
        );
      }
    }
    return null;
  }

  async readEvent(
    runtimeSessionId: string
  ): Promise<KimiNativeTokenUsageEvent | null> {
    const providerSessionId = normalizeProviderSessionId(runtimeSessionId);
    if (!providerSessionId) {
      return null;
    }
    const tokenUsage = await this.read(providerSessionId);
    if (!tokenUsage) {
      return null;
    }
    const data: KimiNativeTokenUsageEventData = {
      kind: "token_usage",
      limit: tokenUsage.limit,
      provider: "kimi",
      providerSessionId,
      source: "kimi_native_wire",
      timestamp: this.clock().toISOString(),
      tokenUsage,
      used: tokenUsage.used,
    };
    return {
      data,
      payload: data,
      providerSessionId,
      type: "stream_event",
    };
  }
}

export const readKimiNativeTokenUsageFromWireJsonl = (
  text: string,
  limit = KIMI_NATIVE_CONTEXT_TOKEN_LIMIT
): KimiNativeTokenUsageSnapshot | null => {
  let latest: KimiNativeTokenUsageSnapshot | null = null;
  for (const line of text.split(JSONL_LINE_BREAK_PATTERN)) {
    const record = parseJsonLine(line);
    const usage = readUsageRecord(record);
    const used = usage ? sumUsageTokens(usage) : null;
    if (used !== null) {
      latest = { limit, used };
    }
  }
  return latest;
};

const normalizeProviderSessionId = (sessionId: string): string | null => {
  const normalized = sessionId.startsWith("kimi:")
    ? sessionId.slice("kimi:".length)
    : sessionId;
  return PROVIDER_SESSION_ID_PATTERN.test(normalized) ? normalized : null;
};

const parseJsonLine = (line: string): unknown => {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
};

const readUsageRecord = (record: unknown): Record<string, unknown> | null => {
  if (!isRecord(record)) {
    return null;
  }
  if (record.type === "usage.record" && isRecord(record.usage)) {
    return record.usage;
  }
  if (
    record.type === "context.append_loop_event" &&
    isRecord(record.event) &&
    record.event.type === "step.end" &&
    isRecord(record.event.usage)
  ) {
    return record.event.usage;
  }
  return null;
};

const sumUsageTokens = (usage: Record<string, unknown>): number | null => {
  const total =
    readNumber(usage.inputOther) +
    readNumber(usage.inputCacheRead) +
    readNumber(usage.inputCacheCreation) +
    readNumber(usage.output);
  return total > 0 ? Math.round(total) : null;
};

const readNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
