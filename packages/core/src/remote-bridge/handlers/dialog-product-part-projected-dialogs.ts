import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ContinuityIndexEntry } from "../../session-continuity/index-registry";

interface ProductPartProjectedState {
  readonly modelBinding?: ContinuityIndexEntry["modelBinding"];
  readonly providerId?: string | null;
  readonly sessionId?: string | null;
  readonly sessionStage?: string | null;
  readonly updatedAt?: string | null;
  readonly worktreePath?: string | null;
}

interface ContinuityIndexLike {
  readonly entries?: readonly ContinuityIndexEntry[];
  readonly workspaceSlug?: string;
}

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
};

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const buildManagedProductPartRoot = (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    options.workspaceRoot,
    ".codeai-hub",
    options.workspaceSlug,
    "workflow",
    "managed",
    "development-tree-product-parts"
  );

const buildContinuityIndexPath = (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    options.workspaceRoot,
    ".codeai-hub",
    options.workspaceSlug,
    "continuity",
    "index.json"
  );

const isProjectedState = (
  value: ProductPartProjectedState | null
): value is Required<
  Pick<
    ProductPartProjectedState,
    "providerId" | "sessionId" | "sessionStage" | "updatedAt" | "worktreePath"
  >
> &
  ProductPartProjectedState =>
  Boolean(
    readNonEmptyString(value?.providerId) &&
      readNonEmptyString(value?.sessionId) &&
      readNonEmptyString(value?.sessionStage)?.startsWith(
        "development_tree/"
      ) &&
      readNonEmptyString(value?.updatedAt) &&
      readNonEmptyString(value?.worktreePath)
  );

const createFallbackEntry = (
  state: ProductPartProjectedState
): ContinuityIndexEntry => {
  const worktreePath = readNonEmptyString(state.worktreePath);
  return {
    dialogId: readNonEmptyString(state.sessionId) ?? "",
    latestSessionId: readNonEmptyString(state.sessionId),
    modelBinding: state.modelBinding ?? null,
    providerId: readNonEmptyString(state.providerId),
    providerSessionId: readNonEmptyString(state.sessionId),
    rootSessionId: readNonEmptyString(state.sessionId) ?? "",
    stage: readNonEmptyString(
      state.sessionStage
    ) as ContinuityIndexEntry["stage"],
    updatedAt: readNonEmptyString(state.updatedAt) ?? "",
    ...(worktreePath ? { worktreePath } : {}),
  } as ContinuityIndexEntry;
};

const readWorktreeEntry = async (params: {
  readonly state: ProductPartProjectedState;
  readonly workspaceSlug: string;
}): Promise<ContinuityIndexEntry | null> => {
  const worktreePath = readNonEmptyString(params.state.worktreePath);
  const stage = readNonEmptyString(params.state.sessionStage);
  if (!(worktreePath && stage)) {
    return null;
  }
  const index = await readJson<ContinuityIndexLike>(
    buildContinuityIndexPath({
      workspaceRoot: worktreePath,
      workspaceSlug: params.workspaceSlug,
    })
  );
  const candidates =
    index?.workspaceSlug === params.workspaceSlug &&
    Array.isArray(index.entries)
      ? index.entries.filter((entry) => entry.stage === stage)
      : [];
  const sessionId = readNonEmptyString(params.state.sessionId);
  const selected =
    candidates.find((entry) => entry.latestSessionId === sessionId) ??
    candidates.find(
      (entry) =>
        sessionId &&
        (entry.dialogId.includes(sessionId) ||
          entry.rootSessionId.includes(sessionId))
    ) ??
    candidates[0] ??
    null;
  return selected
    ? ({ ...selected, worktreePath } as ContinuityIndexEntry)
    : null;
};

export const readProjectedProductPartDialogs = async (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<readonly ContinuityIndexEntry[]> => {
  const root = buildManagedProductPartRoot(options);
  const entries = await readdir(root).catch(() => []);
  const projected: ContinuityIndexEntry[] = [];
  for (const entry of entries) {
    if (!(entry.endsWith(".json") && !entry.endsWith(".unlock-state.json"))) {
      continue;
    }
    const state = await readJson<ProductPartProjectedState>(
      path.join(root, entry)
    );
    if (!isProjectedState(state)) {
      continue;
    }
    projected.push(
      (await readWorktreeEntry({
        state,
        workspaceSlug: options.workspaceSlug,
      })) ?? createFallbackEntry(state)
    );
  }
  return projected;
};
