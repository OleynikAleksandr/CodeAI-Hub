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
  const index = await readJsonRecord(
    worktreePath,
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
      return readNonEmptyString(entry.stage) === stage;
    }
  );
  const sessionId = readNonEmptyString(params.node?.sessionId);
  const matchingRuntimeSession = candidates.find(
    (entry) =>
      sessionId && readNonEmptyString(entry.latestSessionId) === sessionId
  );
  const matchingDialogId = candidates.find(
    (entry) =>
      sessionId &&
      (readNonEmptyString(entry.dialogId)?.includes(sessionId) ||
        readNonEmptyString(entry.rootSessionId)?.includes(sessionId))
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
  const dialogId =
    readNonEmptyString(worktreeEntry?.dialogId) ?? node.sessionId;
  const providerId =
    readNonEmptyString(worktreeEntry?.providerId) ?? node.providerId;
  const providerSessionId =
    readNonEmptyString(worktreeEntry?.providerSessionId) ?? node.sessionId;
  const rootSessionId =
    readNonEmptyString(worktreeEntry?.rootSessionId) ?? node.sessionId;
  const sessionId =
    readNonEmptyString(worktreeEntry?.latestSessionId) ?? node.sessionId;
  const updatedAt =
    readNonEmptyString(worktreeEntry?.updatedAt) ?? node.startedAt;
  return {
    dialogId,
    providerId,
    providerSessionId,
    rootSessionId,
    sessionId,
    updatedAt,
  };
};
