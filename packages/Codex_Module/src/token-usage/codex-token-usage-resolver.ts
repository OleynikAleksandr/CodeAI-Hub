import { access, readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const CODEAI_CODEX_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "codex",
  "home"
);

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

const extractSessionIdFromMeta = (events: unknown[]): string | null => {
  for (const event of events) {
    if (!isRecord(event)) {
      continue;
    }
    if (event.type === "session_meta" && isRecord(event.payload)) {
      const id = event.payload.id;
      if (typeof id === "string" && id.trim()) {
        return id.trim();
      }
    }
  }
  return null;
};

interface DirectoryEntry {
  readonly name: string;
  readonly path: string;
}

const sortByNameDescending = (
  entries: readonly DirectoryEntry[]
): DirectoryEntry[] =>
  [...entries].sort((left, right) => right.name.localeCompare(left.name));

const listDirectories = async (dirPath: string): Promise<DirectoryEntry[]> => {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return sortByNameDescending(
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
    return sortByNameDescending(
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

const scanDayDirectoryForPattern = async (
  dayPath: string,
  providerSessionId: string
): Promise<string | null> => {
  const files = await listFiles(dayPath);
  for (const file of files) {
    if (matchesRolloutPattern(file.name, providerSessionId)) {
      return file.path;
    }
  }
  return null;
};

const scanDayDirectoryForMeta = async (
  dayPath: string,
  providerSessionId: string
): Promise<string | null> => {
  const files = await listFiles(dayPath);
  for (const file of files) {
    if (!file.name.endsWith(".jsonl")) {
      continue;
    }
    const events = await readJsonlFile(file.path);
    const sessionId = extractSessionIdFromMeta(events);
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
    const result = usePattern
      ? await scanDayDirectoryForPattern(dayDir.path, providerSessionId)
      : await scanDayDirectoryForMeta(dayDir.path, providerSessionId);
    if (result) {
      return result;
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
    const result = await scanMonthDirectory(
      monthDir.path,
      providerSessionId,
      usePattern
    );
    if (result) {
      return result;
    }
  }
  return null;
};

const findRolloutFileByPattern = async (
  codexHome: string,
  providerSessionId: string
): Promise<string | null> => {
  const sessionsRoot = path.join(codexHome, "sessions");
  const yearDirs = await listDirectories(sessionsRoot);

  for (const yearDir of yearDirs) {
    const result = await scanYearDirectory(
      yearDir.path,
      providerSessionId,
      true
    );
    if (result) {
      return result;
    }
  }

  return null;
};

const findRolloutFileByScan = async (
  codexHome: string,
  providerSessionId: string
): Promise<string | null> => {
  const sessionsRoot = path.join(codexHome, "sessions");
  const yearDirs = await listDirectories(sessionsRoot);

  for (const yearDir of yearDirs) {
    const result = await scanYearDirectory(
      yearDir.path,
      providerSessionId,
      false
    );
    if (result) {
      return result;
    }
  }

  return null;
};

export interface RolloutResolverOptions {
  readonly codexHome?: string;
}

export const resolveRolloutFilePath = async (
  providerSessionId: string,
  options?: RolloutResolverOptions
): Promise<string | null> => {
  const codexHome = options?.codexHome ?? CODEAI_CODEX_HOME;

  // Primary: exact pattern match
  const primaryPath = await findRolloutFileByPattern(
    codexHome,
    providerSessionId
  );
  if (primaryPath && (await fileExists(primaryPath))) {
    return primaryPath;
  }

  // Fallback: scan and verify session_meta.payload.id
  return findRolloutFileByScan(codexHome, providerSessionId);
};
