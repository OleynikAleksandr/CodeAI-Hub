import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  DescriptionBranchSnapshot,
  DescriptionSessionRef,
  DescriptionStepSnapshot,
  DescriptionStepUpdate,
} from "./description-step-types";

const ROOT_DIR = ".codeai-hub";
const DESCRIPTION_DIR = "description";
const STATE_FILE_NAME = "description-step.json";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const resolveField = (
  current: string | undefined,
  update: string | null | undefined
): string | undefined => {
  if (update === null) {
    return;
  }
  return update ?? current;
};

const resolveSession = (
  current: DescriptionSessionRef | undefined,
  update: DescriptionSessionRef | null | undefined
): DescriptionSessionRef | undefined => {
  if (update === null) {
    return;
  }
  return update ?? current;
};

const parseSessionRef = (value: unknown): DescriptionSessionRef | null => {
  if (!isRecord(value)) {
    return null;
  }
  const providerId = readNonEmptyString(value.providerId);
  const providerSessionId = readNonEmptyString(value.providerSessionId);
  const jsonlPath = readNonEmptyString(value.jsonlPath);
  if (!(providerId && providerSessionId && jsonlPath)) {
    return null;
  }
  const dialogSessionId = readNonEmptyString(
    (value as { readonly dialogSessionId?: unknown }).dialogSessionId
  );
  return {
    providerId,
    providerSessionId,
    jsonlPath,
    dialogSessionId: dialogSessionId ?? undefined,
  };
};

const parsePrimarySessionRef = (
  value: Record<string, unknown>
): DescriptionSessionRef | null =>
  parseSessionRef(
    (value as { readonly primarySession?: unknown }).primarySession
  ) ??
  parseSessionRef(
    (value as { readonly collectorSession?: unknown }).collectorSession
  ) ??
  parseSessionRef(value.session);

const parseSnapshot = (
  value: unknown,
  fallbackWorkspacePath: string
): DescriptionStepSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }
  const workspaceSlug = readNonEmptyString(value.workspaceSlug);
  const workspacePath = readNonEmptyString(value.workspacePath);
  const createdAt = readNonEmptyString(value.createdAt);
  const updatedAt = readNonEmptyString(value.updatedAt);
  if (!(workspaceSlug && createdAt && updatedAt)) {
    return null;
  }
  const questionnairePath =
    readNonEmptyString(value.questionnairePath) ?? undefined;
  const draftPath = readNonEmptyString(value.draftPath) ?? undefined;
  const finalPath = readNonEmptyString(value.finalPath) ?? undefined;
  const primarySession = parsePrimarySessionRef(value);

  return {
    workspaceSlug,
    // Older snapshots may miss workspacePath or store a slug-ish value.
    // Use the caller-provided absolute workspace root as a stable fallback.
    workspacePath: normalizeWorkspacePath(
      workspacePath && path.isAbsolute(workspacePath)
        ? workspacePath
        : fallbackWorkspacePath
    ),
    createdAt,
    updatedAt,
    questionnairePath,
    draftPath,
    finalPath,
    primarySession: primarySession ?? undefined,
  };
};

const buildStatePath = (workspaceRoot: string, workspaceSlug: string): string =>
  path.join(
    workspaceRoot,
    ROOT_DIR,
    workspaceSlug,
    DESCRIPTION_DIR,
    STATE_FILE_NAME
  );

const normalizeWorkspacePath = (value: string): string => {
  // Keep comparisons stable across equivalent absolute paths such as
  // `/path/to/ws` vs `/path/to/ws/`.
  return path.resolve(value);
};

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

export const buildDescriptionBranchSnapshot = (
  snapshot: DescriptionStepSnapshot
): DescriptionBranchSnapshot => {
  if (snapshot.finalPath) {
    return {
      updatedAt: snapshot.updatedAt,
      finalPath: snapshot.finalPath,
      primarySession: snapshot.primarySession,
    };
  }

  return {
    updatedAt: snapshot.updatedAt,
    questionnairePath: snapshot.questionnairePath,
    draftPath: snapshot.draftPath,
    primarySession: snapshot.primarySession,
  };
};

export class DescriptionStepStore {
  private readonly clock: () => string;

  constructor(options?: { readonly clock?: () => string }) {
    this.clock = options?.clock ?? (() => new Date().toISOString());
  }

  async read(
    workspaceRoot: string,
    workspaceSlug: string
  ): Promise<DescriptionStepSnapshot | null> {
    const snapshot = await readJson<DescriptionStepSnapshot>(
      buildStatePath(workspaceRoot, workspaceSlug)
    );
    if (!snapshot) {
      return null;
    }
    const parsed = parseSnapshot(snapshot, workspaceRoot);
    if (!parsed) {
      return null;
    }
    // Validate workspacePath matches current workspaceRoot
    // If mismatch, treat the persisted dialog ref as stale (cross-workspace leak)
    if (
      normalizeWorkspacePath(parsed.workspacePath) !==
      normalizeWorkspacePath(workspaceRoot)
    ) {
      return {
        ...parsed,
        primarySession: undefined,
      };
    }
    return parsed;
  }

  async upsert(
    workspaceRoot: string,
    workspaceSlug: string,
    update: DescriptionStepUpdate
  ): Promise<DescriptionStepSnapshot> {
    const existing = await this.read(workspaceRoot, workspaceSlug);
    const now = this.clock();
    const next: DescriptionStepSnapshot = {
      workspaceSlug,
      workspacePath: normalizeWorkspacePath(workspaceRoot),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      questionnairePath: resolveField(
        existing?.questionnairePath,
        update.questionnairePath
      ),
      draftPath: resolveField(existing?.draftPath, update.draftPath),
      finalPath: resolveField(existing?.finalPath, update.finalPath),
      primarySession: resolveSession(
        existing?.primarySession,
        update.primarySession
      ),
    };

    await writeJson(buildStatePath(workspaceRoot, workspaceSlug), next);
    return next;
  }
}
