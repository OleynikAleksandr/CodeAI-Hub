import { access, readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  type CodexRolloutUsageLimitsSnapshot,
  extractLatestUsageLimitsFromRollout,
} from "./codex-usage-limits-normalizer";

const DEFAULT_CODEAI_CODEX_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "codex",
  "home"
);

interface DirectoryEntry {
  readonly name: string;
  readonly path: string;
}

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readJsonlFile = async (filePath: string): Promise<unknown[]> => {
  try {
    const content = await readFile(filePath, "utf8");
    return content
      .split(/\r?\n/g)
      .filter((line) => line.trim().startsWith("{"))
      .map((line) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return null;
        }
      })
      .filter((item): item is unknown => item !== null);
  } catch {
    return [];
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractSessionIdFromMeta = (
  events: readonly unknown[]
): string | null => {
  for (const event of events) {
    if (!isRecord(event)) {
      continue;
    }
    if (event.type === "session_meta" && isRecord(event.payload)) {
      const sessionId = event.payload.id;
      if (typeof sessionId === "string" && sessionId.trim()) {
        return sessionId.trim();
      }
    }
  }
  return null;
};

const sortEntriesDescending = (
  entries: readonly DirectoryEntry[]
): DirectoryEntry[] =>
  [...entries].sort((left, right) => right.name.localeCompare(left.name));

const listDirectories = async (dirPath: string): Promise<DirectoryEntry[]> => {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return sortEntriesDescending(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          name: entry.name,
          path: path.join(dirPath, entry.name),
        }))
    );
  } catch {
    return [];
  }
};

const listFiles = async (dirPath: string): Promise<DirectoryEntry[]> => {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return sortEntriesDescending(
      entries
        .filter((entry) => entry.isFile())
        .map((entry) => ({
          name: entry.name,
          path: path.join(dirPath, entry.name),
        }))
    );
  } catch {
    return [];
  }
};

const matchesRolloutPattern = (
  fileName: string,
  providerSessionId: string
): boolean =>
  fileName.startsWith("rollout-") &&
  fileName.endsWith(`-${providerSessionId}.jsonl`);

const scanDayDirectory = async (
  dayPath: string,
  providerSessionId: string,
  usePattern: boolean
): Promise<string | null> => {
  const files = await listFiles(dayPath);
  for (const file of files) {
    if (usePattern) {
      if (matchesRolloutPattern(file.name, providerSessionId)) {
        return file.path;
      }
      continue;
    }

    if (!file.name.endsWith(".jsonl")) {
      continue;
    }
    const sessionId = extractSessionIdFromMeta(await readJsonlFile(file.path));
    if (sessionId === providerSessionId) {
      return file.path;
    }
  }
  return null;
};

const scanMonthDirectory = async (
  monthPath: string,
  providerSessionId: string,
  usePattern: boolean
): Promise<string | null> => {
  const dayDirs = await listDirectories(monthPath);
  for (const dayDir of dayDirs) {
    const filePath = await scanDayDirectory(
      dayDir.path,
      providerSessionId,
      usePattern
    );
    if (filePath) {
      return filePath;
    }
  }
  return null;
};

const scanYearDirectory = async (
  yearPath: string,
  providerSessionId: string,
  usePattern: boolean
): Promise<string | null> => {
  const monthDirs = await listDirectories(yearPath);
  for (const monthDir of monthDirs) {
    const filePath = await scanMonthDirectory(
      monthDir.path,
      providerSessionId,
      usePattern
    );
    if (filePath) {
      return filePath;
    }
  }
  return null;
};

export interface CodexRolloutUsageLimitsReaderOptions {
  readonly codexHome?: string;
}

export const resolveCodexRolloutFilePath = async (
  providerSessionId: string,
  options: CodexRolloutUsageLimitsReaderOptions = {}
): Promise<string | null> => {
  const codexHome = options.codexHome ?? DEFAULT_CODEAI_CODEX_HOME;
  const sessionsRoot = path.join(codexHome, "sessions");
  const yearDirs = await listDirectories(sessionsRoot);

  for (const yearDir of yearDirs) {
    const primaryPath = await scanYearDirectory(
      yearDir.path,
      providerSessionId,
      true
    );
    if (primaryPath && (await fileExists(primaryPath))) {
      return primaryPath;
    }
  }

  for (const yearDir of yearDirs) {
    const fallbackPath = await scanYearDirectory(
      yearDir.path,
      providerSessionId,
      false
    );
    if (fallbackPath) {
      return fallbackPath;
    }
  }

  return null;
};

export class CodexRolloutUsageLimitsReader {
  readonly #codexHome: string;

  constructor(options: CodexRolloutUsageLimitsReaderOptions = {}) {
    this.#codexHome = options.codexHome ?? DEFAULT_CODEAI_CODEX_HOME;
  }

  async read(
    providerSessionId: string
  ): Promise<CodexRolloutUsageLimitsSnapshot | null> {
    const normalizedSessionId = providerSessionId.trim();
    if (!normalizedSessionId) {
      return null;
    }

    const filePath = await resolveCodexRolloutFilePath(normalizedSessionId, {
      codexHome: this.#codexHome,
    });
    if (!filePath) {
      return null;
    }

    return extractLatestUsageLimitsFromRollout(await readJsonlFile(filePath));
  }
}
