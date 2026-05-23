import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildSessionFilePath,
  buildSessionTranslationFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";

interface ContinuityIndexEntryRecord {
  readonly latestSessionId: string | null;
  readonly providerId: string | null;
  readonly providerSessionId: string | null;
  readonly rootSessionId: string;
  readonly stage: string;
}

interface ContinuityIndexRequest {
  readonly isStageInScope: (stage: string | null) => boolean;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const indexPathFor = (params: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug,
    "continuity",
    "index.json"
  );

const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
};

const writeJsonFile = async (
  filePath: string,
  value: unknown
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const readContinuityIndexEntries = async (params: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<ContinuityIndexEntryRecord[]> => {
  const index = await readJsonFile<{ readonly entries?: unknown }>(
    indexPathFor(params)
  );
  if (!Array.isArray(index?.entries)) {
    return [];
  }
  return index.entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const stage = readString(record.stage);
    const rootSessionId = readString(record.rootSessionId);
    if (!(stage && rootSessionId)) {
      return [];
    }
    return [
      {
        stage,
        rootSessionId,
        latestSessionId: readString(record.latestSessionId),
        providerId: readString(record.providerId),
        providerSessionId: readString(record.providerSessionId),
      },
    ];
  });
};

export const collectContinuityIndexUserSpaceSessionPaths = async (params: {
  readonly isStageInScope: (stage: string | null) => boolean;
  readonly rootDirectory: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<string[]> => {
  const paths = new Set<string>();
  for (const entry of await readContinuityIndexEntries(params)) {
    if (!params.isStageInScope(entry.stage)) {
      continue;
    }
    const historySessionId = sanitizeWorkspaceSlug(
      entry.providerSessionId ?? entry.latestSessionId ?? entry.rootSessionId
    );
    if (!(entry.providerId && historySessionId)) {
      continue;
    }
    paths.add(
      buildSessionFilePath({
        provider: entry.providerId,
        rootDirectory: params.rootDirectory,
        sessionId: historySessionId,
        workspaceSlug: params.workspaceSlug,
      })
    );
    paths.add(
      buildSessionTranslationFilePath({
        provider: entry.providerId,
        rootDirectory: params.rootDirectory,
        sessionId: historySessionId,
        workspaceSlug: params.workspaceSlug,
      })
    );
  }
  return [...paths];
};

export const cleanupDescriptionState = async (params: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const statePath = path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug,
    "description",
    "description-step.json"
  );
  const state = await readJsonFile<Record<string, unknown>>(statePath);
  if (!state) {
    return;
  }
  const questionnairePath = readString(state.questionnairePath);
  await writeJsonFile(statePath, {
    workspaceSlug: state.workspaceSlug ?? params.workspaceSlug,
    workspacePath: state.workspacePath ?? params.workspacePath,
    createdAt: state.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(questionnairePath ? { questionnairePath } : {}),
  });
};

export const pruneContinuityIndex = async (
  params: ContinuityIndexRequest
): Promise<void> => {
  const indexPath = indexPathFor(params);
  const index = await readJsonFile<{
    readonly entries?: unknown;
    readonly version?: number;
    readonly workspaceSlug?: string;
  }>(indexPath);
  if (!Array.isArray(index?.entries)) {
    return;
  }
  const nextEntries = index.entries.filter((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    return !params.isStageInScope(
      readString((entry as Record<string, unknown>).stage)
    );
  });
  await writeJsonFile(indexPath, {
    ...index,
    version: index.version ?? 1,
    workspaceSlug: index.workspaceSlug ?? params.workspaceSlug,
    updatedAt: new Date().toISOString(),
    entries: nextEntries,
  });
};
