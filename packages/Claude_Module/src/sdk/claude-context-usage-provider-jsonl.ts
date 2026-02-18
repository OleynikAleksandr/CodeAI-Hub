import { access, open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { ContextUsageSnapshot } from "./claude-context-usage-snapshot";
import { extractSnapshotFromStreamJsonLine } from "./claude-context-usage-snapshot";
import { resolveClaudeProviderProjectsDir } from "./claude-provider-home";

const CLAUDE_PROJECTS_ROOT = resolveClaudeProviderProjectsDir();

const PROVIDER_JSONL_TAIL_MAX_BYTES = 1024 * 1024;
const PROVIDER_JSONL_BACKTRACK_BYTES = 8192;
const PROVIDER_JSONL_SNAPSHOT_RETRIES = 4;
const PROVIDER_JSONL_SNAPSHOT_RETRY_DELAY_MS = 120;

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const safeReadFileSize = async (
  filePath: string
): Promise<number | null> => {
  try {
    const stats = await stat(filePath);
    return Number.isFinite(stats.size) ? stats.size : null;
  } catch {
    return null;
  }
};

export const resolveProviderJsonlPathForClaudeSession = async (
  sessionId: string
): Promise<string | null> => {
  let candidates: string[] = [];
  try {
    candidates = (await readdir(CLAUDE_PROJECTS_ROOT, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(CLAUDE_PROJECTS_ROOT, entry.name));
  } catch {
    return null;
  }

  for (const projectDir of candidates) {
    const candidate = path.join(projectDir, `${sessionId}.jsonl`);
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
};

const readLatestSnapshotFromProviderJsonlTail = async (options: {
  readonly jsonlPath: string;
  readonly fromByteOffset: number | null;
}): Promise<ContextUsageSnapshot | null> => {
  let size = 0;
  try {
    const stats = await stat(options.jsonlPath);
    size = stats.size;
  } catch {
    return null;
  }

  if (!Number.isFinite(size) || size <= 0) {
    return null;
  }

  const start = (() => {
    if (
      options.fromByteOffset !== null &&
      Number.isFinite(options.fromByteOffset)
    ) {
      const bounded = Math.max(0, Math.min(size, options.fromByteOffset));
      return Math.max(0, bounded - PROVIDER_JSONL_BACKTRACK_BYTES);
    }
    return Math.max(0, size - PROVIDER_JSONL_TAIL_MAX_BYTES);
  })();

  const length = Math.min(PROVIDER_JSONL_TAIL_MAX_BYTES, size - start);
  if (!Number.isFinite(length) || length <= 0) {
    return null;
  }

  const handle = await open(options.jsonlPath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, start);
    const text = buffer.subarray(0, bytesRead).toString("utf8");
    const lines = text.split(/\r?\n/g);
    if (start > 0) {
      lines.shift();
    }

    let latest: ContextUsageSnapshot | null = null;
    for (const line of lines) {
      const snapshot = extractSnapshotFromStreamJsonLine(line);
      if (snapshot) {
        latest = snapshot;
      }
    }
    return latest;
  } finally {
    await handle.close();
  }
};

const wait = async (ms: number): Promise<void> => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const readSnapshotFromProviderJsonlWithRetries = async (options: {
  readonly jsonlPath: string;
  readonly fromByteOffset: number | null;
}): Promise<ContextUsageSnapshot | null> => {
  for (
    let attempt = 0;
    attempt < PROVIDER_JSONL_SNAPSHOT_RETRIES;
    attempt += 1
  ) {
    const snapshot = await readLatestSnapshotFromProviderJsonlTail(options);
    if (snapshot) {
      return snapshot;
    }
    if (attempt < PROVIDER_JSONL_SNAPSHOT_RETRIES - 1) {
      await wait(PROVIDER_JSONL_SNAPSHOT_RETRY_DELAY_MS);
    }
  }

  return null;
};
