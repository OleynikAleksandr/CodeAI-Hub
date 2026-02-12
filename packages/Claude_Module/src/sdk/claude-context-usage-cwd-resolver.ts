import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { resolveClaudeProviderProjectsDir } from "./claude-provider-home";

const CLAUDE_PROJECTS_ROOT = resolveClaudeProviderProjectsDir();
const SESSIONS_INDEX_FILENAME = "sessions-index.json";

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

export const resolveCwdForClaudeSession = async (payload: {
  readonly sessionId: string;
  readonly fallbackCwd: string;
}): Promise<string> => {
  let candidates: string[] = [];
  try {
    candidates = (await readdir(CLAUDE_PROJECTS_ROOT, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(CLAUDE_PROJECTS_ROOT, entry.name));
  } catch {
    return payload.fallbackCwd;
  }

  for (const projectDir of candidates) {
    const sessionFilePath = path.join(projectDir, `${payload.sessionId}.jsonl`);
    if (!(await fileExists(sessionFilePath))) {
      continue;
    }

    const sessionsIndexPath = path.join(projectDir, SESSIONS_INDEX_FILENAME);
    const index = await readJsonFile(sessionsIndexPath);
    const projectPath = resolveProjectPathFromSessionsIndex(
      index,
      payload.sessionId
    );
    if (projectPath) {
      return projectPath;
    }

    return payload.fallbackCwd;
  }

  return payload.fallbackCwd;
};
