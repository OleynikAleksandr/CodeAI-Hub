import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildSessionFilePath,
  buildSessionTranslationFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const WORKFLOW_STAGES = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];
const STAGE_FILE_SUFFIXES: Record<WorkflowStageId, readonly string[]> = {
  application_skeleton: ["application-skeleton"],
  description: ["description"],
  diagram_modules: ["diagram-modules"],
  quality_gates: ["quality-gates"],
  virtual_simulation: ["virtual-simulation"],
};

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

const downstreamStages = (
  stage: WorkflowStageId
): readonly WorkflowStageId[] => {
  const index = WORKFLOW_STAGES.indexOf(stage);
  return index < 0 ? [] : WORKFLOW_STAGES.slice(index);
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

export const collectStageNamedUserSpaceSessionPaths = async (params: {
  readonly rootDirectory: string;
  readonly stage: WorkflowStageId;
  readonly workspaceSlug: string;
}): Promise<string[]> => {
  const workspaceSessionRoot = path.join(
    params.rootDirectory,
    params.workspaceSlug
  );
  const stageSuffixes = new Set(
    downstreamStages(params.stage).flatMap(
      (stage) => STAGE_FILE_SUFFIXES[stage]
    )
  );
  const stageSuffixList = [...stageSuffixes];
  const providerEntries = await readdir(workspaceSessionRoot, {
    withFileTypes: true,
  }).catch(() => []);
  const paths: string[] = [];
  for (const providerEntry of providerEntries) {
    if (!providerEntry.isDirectory()) {
      continue;
    }
    const providerDirectory = path.join(
      workspaceSessionRoot,
      providerEntry.name
    );
    const fileEntries = await readdir(providerDirectory, {
      withFileTypes: true,
    }).catch(() => []);
    for (const fileEntry of fileEntries) {
      if (!fileEntry.isFile()) {
        continue;
      }
      const fileName = fileEntry.name;
      const isMatchingStageFile = stageSuffixList.some(
        (suffix) =>
          fileName.endsWith(`-${suffix}.jsonl`) ||
          fileName.endsWith(`-${suffix}.translations.jsonl`)
      );
      if (isMatchingStageFile) {
        paths.push(path.join(providerDirectory, fileName));
      }
    }
  }
  return paths;
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
  if (nextEntries.length === 0) {
    await rm(path.dirname(indexPath), { force: true, recursive: true });
    return;
  }
  await writeJsonFile(indexPath, {
    ...index,
    version: index.version ?? 1,
    workspaceSlug: index.workspaceSlug ?? params.workspaceSlug,
    updatedAt: new Date().toISOString(),
    entries: nextEntries,
  });
};
