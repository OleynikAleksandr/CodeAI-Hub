import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { DevelopmentTreeNodeSession } from "../../development-tree/development-tree-types";

export type CoordinationStatus =
  | "locked"
  | "merge_ready"
  | "merged"
  | "unlocked"
  | "waiting";

export interface UnlockStateNode {
  readonly branchName?: string;
  readonly id?: string;
  readonly mergeCommitHash?: string;
  readonly providerId?: string;
  readonly reason?: string;
  readonly sessionId?: string;
  readonly sessionStage?: string;
  readonly startedAt?: string;
  readonly status?: CoordinationStatus;
  readonly worktreePath?: string;
}

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const readJsonRecord = async (
  workspaceRoot: string,
  relativePath: string
): Promise<Record<string, unknown> | null> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!((await stat(absolutePath).catch(() => null))?.isFile() ?? false)) {
    return null;
  }
  const parsed = JSON.parse(await readFile(absolutePath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
};

const createUnlockStatePath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.unlock-state.json`;

const createProductPartManagedStatePath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.json`;

const createProductPartStage = (partId: string): string =>
  `development_tree/materialized/product-parts/${partId}`;

const readContinuityEntryForStage = async (params: {
  readonly sessionId: string | null;
  readonly stage: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<Record<string, unknown> | null> => {
  const index = await readJsonRecord(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/continuity/index.json`
  );
  if (
    index?.workspaceSlug !== params.workspaceSlug ||
    !Array.isArray(index.entries)
  ) {
    return null;
  }
  const candidates = index.entries.filter(
    (entry): entry is Record<string, unknown> => {
      if (!(entry && typeof entry === "object" && !Array.isArray(entry))) {
        return false;
      }
      return readNonEmptyString(entry.stage) === params.stage;
    }
  );
  const matchingRuntimeSession = candidates.find(
    (entry) =>
      params.sessionId &&
      readNonEmptyString(entry.latestSessionId) === params.sessionId
  );
  const matchingDialogId = candidates.find(
    (entry) =>
      params.sessionId &&
      (readNonEmptyString(entry.dialogId)?.includes(params.sessionId) ||
        readNonEmptyString(entry.rootSessionId)?.includes(params.sessionId))
  );
  return (
    matchingRuntimeSession ??
    matchingDialogId ??
    [...candidates].sort(
      (left, right) =>
        readNonEmptyString(right.updatedAt)?.localeCompare(
          readNonEmptyString(left.updatedAt) ?? ""
        ) ?? 0
    )[0] ??
    null
  );
};

const createSessionFromContinuityEntry = (params: {
  readonly entry: Record<string, unknown> | null;
  readonly fallbackSessionId: string;
  readonly fallbackUpdatedAt: string | null;
  readonly providerId?: string;
}): DevelopmentTreeNodeSession | undefined => {
  const providerId =
    readNonEmptyString(params.entry?.providerId) ?? params.providerId;
  if (!providerId) {
    return undefined;
  }
  const dialogId =
    readNonEmptyString(params.entry?.dialogId) ?? params.fallbackSessionId;
  return {
    dialogId,
    providerId,
    providerSessionId:
      readNonEmptyString(params.entry?.providerSessionId) ??
      params.fallbackSessionId,
    rootSessionId: readNonEmptyString(params.entry?.rootSessionId) ?? dialogId,
    sessionId:
      readNonEmptyString(params.entry?.latestSessionId) ??
      params.fallbackSessionId,
    updatedAt:
      readNonEmptyString(params.entry?.updatedAt) ??
      params.fallbackUpdatedAt ??
      new Date(0).toISOString(),
  };
};

export const readUnlockNodes = async (params: {
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ReadonlyMap<string, UnlockStateNode>> => {
  const state = await readJsonRecord(
    params.workspaceRoot,
    createUnlockStatePath(params)
  );
  const nodes = Array.isArray(state?.nodes) ? state.nodes : [];
  return new Map(
    nodes.flatMap((node) => {
      if (!(node && typeof node === "object" && !Array.isArray(node))) {
        return [];
      }
      const record = node as UnlockStateNode;
      return record.id ? [[record.id, record]] : [];
    })
  );
};

const readWorktreeContinuityEntry = async (params: {
  readonly node: UnlockStateNode | undefined;
  readonly workspaceSlug: string;
}): Promise<Record<string, unknown> | null> => {
  const worktreePath = readNonEmptyString(params.node?.worktreePath);
  const stage = readNonEmptyString(params.node?.sessionStage);
  if (!(worktreePath && stage)) {
    return null;
  }
  return await readContinuityEntryForStage({
    sessionId: readNonEmptyString(params.node?.sessionId),
    stage,
    workspaceRoot: worktreePath,
    workspaceSlug: params.workspaceSlug,
  });
};

export const createProjectedSession = async (params: {
  readonly node: UnlockStateNode | undefined;
  readonly workspaceSlug: string;
}): Promise<DevelopmentTreeNodeSession | undefined> => {
  const { node } = params;
  if (
    !(node?.providerId && node.sessionId && node.sessionStage && node.startedAt)
  ) {
    return undefined;
  }
  const worktreeEntry = await readWorktreeContinuityEntry(params);
  return createSessionFromContinuityEntry({
    entry: worktreeEntry,
    fallbackSessionId: node.sessionId,
    fallbackUpdatedAt: node.startedAt,
    providerId: node.providerId,
  });
};

export const createProductPartProjectedSession = async (params: {
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DevelopmentTreeNodeSession | undefined> => {
  const state = await readJsonRecord(
    params.workspaceRoot,
    createProductPartManagedStatePath(params)
  );
  const sessionId = readNonEmptyString(state?.sessionId);
  if (!sessionId) {
    return undefined;
  }
  const entry = await readContinuityEntryForStage({
    sessionId,
    stage: createProductPartStage(params.partId),
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  return createSessionFromContinuityEntry({
    entry,
    fallbackSessionId: sessionId,
    fallbackUpdatedAt: readNonEmptyString(state?.updatedAt),
  });
};
