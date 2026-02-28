import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  DescriptionBranchSnapshot,
  DescriptionSessionKind,
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

const parseSessionKind = (value: unknown): DescriptionSessionKind | null =>
  value === "collector" || value === "reviewer" ? value : null;

const resolveField = (
  current: string | undefined,
  update: string | null | undefined
): string | undefined => {
  if (update === null) {
    return;
  }
  return update ?? current;
};

const resolveSessionKind = (
  current: DescriptionSessionKind | undefined,
  update: DescriptionSessionKind | null | undefined
): DescriptionSessionKind | undefined => {
  if (current === "reviewer" && update === "collector") {
    return current;
  }
  if (update === null) {
    return;
  }
  return update ?? current;
};

const resolveSession = (
  current: DescriptionSessionRef | undefined,
  update: DescriptionSessionRef | null | undefined,
  kinds?: {
    readonly currentKind?: DescriptionSessionKind;
    readonly updateKind?: DescriptionSessionKind | null | undefined;
  }
): DescriptionSessionRef | undefined => {
  if (kinds?.currentKind === "reviewer" && kinds.updateKind === "collector") {
    return current;
  }
  if (update === null) {
    return;
  }
  return update ?? current;
};

const resolvePrimarySessionUpdate = (
  update: DescriptionStepUpdate
): DescriptionSessionRef | null | undefined => {
  if (update.primarySession !== undefined) {
    return update.primarySession;
  }
  if (update.collectorSession !== undefined) {
    return update.collectorSession;
  }
  if (update.reviewerSession !== undefined) {
    return update.reviewerSession;
  }
  return update.session;
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
  const primarySession = parseSessionRef(
    (value as { readonly primarySession?: unknown }).primarySession
  );
  const collectorSession = parseSessionRef(
    (value as { readonly collectorSession?: unknown }).collectorSession
  );
  const reviewerSession = parseSessionRef(
    (value as { readonly reviewerSession?: unknown }).reviewerSession
  );
  const session = parseSessionRef(value.session);
  const sessionKind =
    parseSessionKind(
      (value as { readonly sessionKind?: unknown }).sessionKind
    ) ?? undefined;

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
    collectorSession: collectorSession ?? undefined,
    reviewerSession: reviewerSession ?? undefined,
    session: session ?? undefined,
    sessionKind,
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
      collectorSession: snapshot.collectorSession,
      reviewerSession: snapshot.reviewerSession,
      session: snapshot.session,
      sessionKind: snapshot.sessionKind,
    };
  }

  return {
    updatedAt: snapshot.updatedAt,
    questionnairePath: snapshot.questionnairePath,
    draftPath: snapshot.draftPath,
    primarySession: snapshot.primarySession,
    collectorSession: snapshot.collectorSession,
    reviewerSession: snapshot.reviewerSession,
    session: snapshot.session,
    sessionKind: snapshot.sessionKind,
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
    // If mismatch, treat session/sessionKind as stale (cross-workspace leak)
    if (
      normalizeWorkspacePath(parsed.workspacePath) !==
      normalizeWorkspacePath(workspaceRoot)
    ) {
      return {
        ...parsed,
        primarySession: undefined,
        collectorSession: undefined,
        reviewerSession: undefined,
        session: undefined,
        sessionKind: undefined,
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
    const nextSessionKind = resolveSessionKind(
      existing?.sessionKind,
      update.sessionKind
    );
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
        resolvePrimarySessionUpdate(update)
      ),
      collectorSession: resolveSession(
        existing?.collectorSession,
        update.collectorSession
      ),
      reviewerSession: resolveSession(
        existing?.reviewerSession,
        update.reviewerSession
      ),
      session: resolveSession(existing?.session, update.session, {
        currentKind: existing?.sessionKind,
        updateKind: update.sessionKind,
      }),
      sessionKind: nextSessionKind,
    };

    await writeJson(buildStatePath(workspaceRoot, workspaceSlug), next);
    return next;
  }
}
