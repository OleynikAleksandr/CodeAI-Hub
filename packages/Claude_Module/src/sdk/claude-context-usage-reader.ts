import { execFile } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const COMPACT_NUMBER_PATTERN = /^([\d.,]+)\s*([kKmM])?$/;
const TOKENS_SNAPSHOT_PATTERNS: readonly RegExp[] = [
  /Tokens:\s*([\d.,]+)\s*([kKmM]?)\s*\/\s*([\d.,]+)\s*([kKmM]?)\s*\(\d+%\)/,
  /\b([\d.,]+)\s*([kKmM]?)\s*\/\s*([\d.,]+)\s*([kKmM]?)\s*tokens\s*\(\d+%\)/,
];
const LOCAL_COMMAND_STDOUT_PATTERN =
  /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/;

const CLAUDE_PROJECTS_ROOT = path.join(homedir(), ".claude", "projects");
const SESSIONS_INDEX_FILENAME = "sessions-index.json";

type ContextUsageReaderOptions = {
  readonly executablePath: string;
  readonly env: NodeJS.ProcessEnv;
};

type ContextUsageSnapshot = {
  readonly used: number;
  readonly limit: number;
};

const parseCompactNumber = (raw: string): number | null => {
  const trimmed = raw.trim();
  const match = COMPACT_NUMBER_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }
  const numeric = Number.parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const suffix = match[2]?.toLowerCase() ?? "";
  let scale = 1;
  if (suffix === "k") {
    scale = 1000;
  } else if (suffix === "m") {
    scale = 1_000_000;
  }
  return Math.round(numeric * scale);
};

const extractTokensSnapshot = (text: string): ContextUsageSnapshot | null => {
  for (const pattern of TOKENS_SNAPSHOT_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) {
      continue;
    }
    const used = parseCompactNumber(`${match[1]}${match[2] ?? ""}`);
    const limit = parseCompactNumber(`${match[3]}${match[4] ?? ""}`);
    if (used !== null && limit !== null && limit > 0) {
      return { used, limit };
    }
  }

  return null;
};

const extractLocalCommandStdout = (value: string): string | null => {
  const match = LOCAL_COMMAND_STDOUT_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  return match[1];
};

const collectStrings = (root: unknown): string[] => {
  const out: string[] = [];
  const queue: unknown[] = [root];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.pop();
    if (typeof current === "string") {
      out.push(current);
      continue;
    }
    if (!current || typeof current !== "object") {
      continue;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }

    for (const value of Object.values(current as Record<string, unknown>)) {
      queue.push(value);
    }
  }

  return out;
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readJsonFile = async (filePath: string): Promise<unknown | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveProjectPathFromSessionsIndex = (
  index: unknown,
  sessionId: string
): string | null => {
  if (!isRecord(index)) {
    return null;
  }
  const entries = index.entries;
  if (!Array.isArray(entries)) {
    return null;
  }
  const match = entries.find(
    (entry) =>
      isRecord(entry) &&
      typeof entry.sessionId === "string" &&
      entry.sessionId === sessionId
  );
  if (!isRecord(match)) {
    return null;
  }
  return typeof match.projectPath === "string" && match.projectPath.trim()
    ? match.projectPath
    : null;
};

const resolveCwdForSession = async (
  sessionId: string,
  fallbackCwd: string
): Promise<string> => {
  let candidates: string[] = [];
  try {
    candidates = (await readdir(CLAUDE_PROJECTS_ROOT, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(CLAUDE_PROJECTS_ROOT, entry.name));
  } catch {
    return fallbackCwd;
  }

  for (const projectDir of candidates) {
    const sessionFilePath = path.join(projectDir, `${sessionId}.jsonl`);
    if (!(await fileExists(sessionFilePath))) {
      continue;
    }
    const sessionsIndexPath = path.join(projectDir, SESSIONS_INDEX_FILENAME);
    const index = await readJsonFile(sessionsIndexPath);
    const projectPath = resolveProjectPathFromSessionsIndex(index, sessionId);
    if (projectPath) {
      return projectPath;
    }
    return fallbackCwd;
  }

  return fallbackCwd;
};

const readContextOutputLines = (output: string): string[] => {
  const combined = output.trim();
  if (!combined) {
    return [];
  }
  return combined.split(/\r?\n/g).map((line) => line.trim());
};

const extractSnapshotFromStreamJsonLine = (
  line: string
): ContextUsageSnapshot | null => {
  if (!line.startsWith("{")) {
    return null;
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(line) as unknown;
  } catch {
    return null;
  }

  for (const candidate of collectStrings(parsed)) {
    const localStdout = extractLocalCommandStdout(candidate);
    if (localStdout) {
      const snapshot = extractTokensSnapshot(localStdout);
      if (snapshot) {
        return snapshot;
      }
    }

    const snapshot = extractTokensSnapshot(candidate);
    if (snapshot) {
      return snapshot;
    }
  }

  return null;
};

const readContextOutputSnapshot = (
  output: string
): ContextUsageSnapshot | null => {
  for (const line of readContextOutputLines(output)) {
    const snapshot = extractSnapshotFromStreamJsonLine(line);
    if (snapshot) {
      return snapshot;
    }
  }
  return null;
};

export class ClaudeContextUsageReader {
  private readonly options: ContextUsageReaderOptions;

  constructor(options: ContextUsageReaderOptions) {
    this.options = options;
  }

  async read(payload: {
    readonly sessionId: string;
    readonly cwd: string;
  }): Promise<ContextUsageSnapshot | null> {
    const resolvedCwd = await resolveCwdForSession(
      payload.sessionId,
      payload.cwd
    );
    const { stdout, stderr } = await execFileAsync(
      this.options.executablePath,
      [
        "-p",
        "--verbose",
        "--output-format",
        "stream-json",
        "--resume",
        payload.sessionId,
        "/context",
      ],
      {
        cwd: resolvedCwd,
        env: this.options.env,
        windowsHide: true,
        timeout: 15_000,
        maxBuffer: 2_000_000,
      }
    );

    return readContextOutputSnapshot(`${stdout}\n${stderr}`);
  }
}
