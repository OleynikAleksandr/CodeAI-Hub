import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import { readContinuityChains } from "../../session-continuity/continuity-store";
import type {
  ContinuityIndex,
  ContinuityIndexEntry,
} from "../../session-continuity/index-registry";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG } from "../../unified-session/storage";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";

const CONTINUITY_ROOT = ".codeai-hub";
const CONTINUITY_DIR = "continuity";
const INDEX_FILE_NAME = "index.json";
const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");

interface ProjectedDevelopmentTreeNode {
  readonly modelBinding?: ContinuityIndexEntry["modelBinding"];
  readonly providerId?: string;
  readonly sessionId?: string;
  readonly sessionStage?: string;
  readonly startedAt?: string;
  readonly worktreePath?: string;
}

interface ProjectedDevelopmentTreeUnlockState {
  readonly nodes?: readonly ProjectedDevelopmentTreeNode[];
}

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

const buildIndexPath = (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    options.workspaceRoot,
    CONTINUITY_ROOT,
    options.workspaceSlug,
    CONTINUITY_DIR,
    INDEX_FILE_NAME
  );

const buildProductPartUnlockStateRoot = (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    options.workspaceRoot,
    CONTINUITY_ROOT,
    options.workspaceSlug,
    "workflow",
    "managed",
    "development-tree-product-parts"
  );

const hasProviderSessionId = (
  value: string | null | undefined
): value is string => typeof value === "string" && value.trim().length > 0;

const readNonEmptyString = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isProjectedDevelopmentTreeNode = (
  value: unknown
): value is ProjectedDevelopmentTreeNode => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return false;
  }
  const node = value as ProjectedDevelopmentTreeNode;
  return Boolean(
    node.providerId?.trim() &&
      node.sessionId?.trim() &&
      node.sessionStage?.startsWith("development_tree/") &&
      node.startedAt?.trim()
  );
};

const createProjectedDialogEntry = (
  node: ProjectedDevelopmentTreeNode
): ContinuityIndexEntry => {
  const worktreePath = readNonEmptyString(node.worktreePath);
  return {
    dialogId: node.sessionId ?? "",
    latestSessionId: node.sessionId ?? null,
    modelBinding: node.modelBinding ?? null,
    providerId: node.providerId ?? null,
    providerSessionId: node.sessionId ?? null,
    rootSessionId: node.sessionId ?? "",
    stage: node.sessionStage as ContinuityIndexEntry["stage"],
    updatedAt: node.startedAt ?? "",
    ...(worktreePath ? { worktreePath } : {}),
  };
};

const readWorktreeContinuityDialogEntry = async (options: {
  readonly node: ProjectedDevelopmentTreeNode;
  readonly workspaceSlug: string;
}): Promise<ContinuityIndexEntry | null> => {
  const worktreePath = readNonEmptyString(options.node.worktreePath);
  const stage = readNonEmptyString(options.node.sessionStage);
  if (!(worktreePath && stage)) {
    return null;
  }
  const index = await readJson<ContinuityIndex>(
    buildIndexPath({
      workspaceRoot: worktreePath,
      workspaceSlug: options.workspaceSlug,
    })
  );
  const candidates =
    index?.workspaceSlug === options.workspaceSlug
      ? index.entries.filter((entry) => entry.stage === stage)
      : [];
  if (candidates.length === 0) {
    return null;
  }
  const sessionId = readNonEmptyString(options.node.sessionId);
  const matchingRuntimeSession = candidates.find(
    (entry) => sessionId && entry.latestSessionId === sessionId
  );
  const matchingDialogId = candidates.find(
    (entry) =>
      sessionId &&
      (entry.dialogId === sessionId ||
        entry.rootSessionId === sessionId ||
        entry.dialogId.includes(sessionId) ||
        entry.rootSessionId.includes(sessionId))
  );
  const selected =
    matchingRuntimeSession ??
    matchingDialogId ??
    [...candidates].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    )[0];
  if (!selected) {
    return null;
  }
  return {
    ...selected,
    modelBinding: selected.modelBinding ?? options.node.modelBinding ?? null,
    ...(worktreePath ? { worktreePath } : {}),
  };
};

const readProjectedDevelopmentTreeDialogs = async (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<readonly ContinuityIndexEntry[]> => {
  const root = buildProductPartUnlockStateRoot(options);
  let entries: string[] = [];
  try {
    entries = await readdir(root);
  } catch {
    return [];
  }
  const projected: ContinuityIndexEntry[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".unlock-state.json")) {
      continue;
    }
    const state = await readJson<ProjectedDevelopmentTreeUnlockState>(
      path.join(root, entry)
    );
    const nodes = Array.isArray(state?.nodes) ? state.nodes : [];
    for (const node of nodes) {
      if (isProjectedDevelopmentTreeNode(node)) {
        projected.push(
          (await readWorktreeContinuityDialogEntry({
            node,
            workspaceSlug: options.workspaceSlug,
          })) ?? createProjectedDialogEntry(node)
        );
      }
    }
  }
  return projected;
};

const buildRuntimeSessionByProviderMap = (
  runtimeSessions: readonly Session[]
): Map<string, Session> => {
  const mapped = new Map<string, Session>();
  for (const session of runtimeSessions) {
    if (!hasProviderSessionId(session.providerSessionId)) {
      continue;
    }
    const current = mapped.get(session.providerSessionId);
    if (!current || session.updatedAt > current.updatedAt) {
      mapped.set(session.providerSessionId, session);
    }
  }
  return mapped;
};

const reconcileLatestSessionIds = (
  entries: readonly ContinuityIndexEntry[],
  runtimeSessions: readonly Session[]
): readonly ContinuityIndexEntry[] => {
  if (entries.length === 0 || runtimeSessions.length === 0) {
    return entries;
  }
  const runtimeByProviderSessionId =
    buildRuntimeSessionByProviderMap(runtimeSessions);
  if (runtimeByProviderSessionId.size === 0) {
    return entries;
  }
  let changed = false;
  const reconciled = entries.map((entry) => {
    if (!hasProviderSessionId(entry.providerSessionId)) {
      return entry;
    }
    const runtime = runtimeByProviderSessionId.get(entry.providerSessionId);
    if (!runtime) {
      return entry;
    }
    if (entry.providerId && runtime.providerId !== entry.providerId) {
      return entry;
    }
    if (entry.latestSessionId === runtime.id) {
      return entry;
    }
    changed = true;
    return {
      ...entry,
      latestSessionId: runtime.id,
      modelBinding: runtime.modelBinding ?? entry.modelBinding ?? null,
    };
  });
  return changed ? reconciled : entries;
};

const buildDialogDeduplicationKey = (
  entry: ContinuityIndexEntry
): string | null => {
  if (!(entry.providerId && hasProviderSessionId(entry.providerSessionId))) {
    return null;
  }
  return [entry.stage, entry.providerId, entry.providerSessionId].join("|");
};

const resolveDialogHistoryLocations = (options: {
  readonly worktreePath?: string | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): readonly {
  readonly rootDirectory: string;
  readonly workspaceSlug: string;
}[] => {
  const locations = [
    {
      rootDirectory:
        resolveWorkspaceRuntimeCapsule(options).sessionsRoot.absolutePath,
      workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
    },
    {
      rootDirectory: SESSION_ROOT,
      workspaceSlug: sanitizeWorkspaceSlug(options.workspaceRoot),
    },
  ];
  const worktreePath = readNonEmptyString(options.worktreePath ?? null);
  if (!worktreePath) {
    return locations;
  }
  return [
    {
      rootDirectory: resolveWorkspaceRuntimeCapsule({
        workspaceRoot: worktreePath,
        workspaceSlug: options.workspaceSlug,
      }).sessionsRoot.absolutePath,
      workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
    },
    ...locations,
  ];
};

const readDialogWorktreePath = (entry: ContinuityIndexEntry): string | null => {
  const worktreePath = (
    entry as ContinuityIndexEntry & {
      readonly worktreePath?: string | null;
    }
  ).worktreePath;
  return readNonEmptyString(worktreePath);
};

export class DialogListService {
  private readonly logger: Logger;

  constructor(options: { readonly logger: Logger }) {
    this.logger = options.logger;
  }

  private async hasDialogHistoryFile(options: {
    readonly dialogId: string;
    readonly providerId: string;
    readonly worktreePath?: string | null;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<boolean> {
    const sessionId = sanitizeWorkspaceSlug(options.dialogId);

    for (const location of resolveDialogHistoryLocations(options)) {
      const filePath = buildSessionFilePath({
        rootDirectory: location.rootDirectory,
        workspaceSlug: location.workspaceSlug,
        provider: options.providerId,
        sessionId,
      });
      try {
        await stat(filePath);
        return true;
      } catch {
        // Try the next history root candidate.
      }
    }
    return false;
  }

  private async selectPreferredEntry(options: {
    readonly entries: readonly ContinuityIndexEntry[];
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ContinuityIndexEntry> {
    let preferred = options.entries[0];
    let preferredHasHistory = preferred?.providerId
      ? await this.hasDialogHistoryFile({
          dialogId: preferred.dialogId,
          providerId: preferred.providerId,
          worktreePath: readDialogWorktreePath(preferred),
          workspaceRoot: options.workspaceRoot,
          workspaceSlug: options.workspaceSlug,
        })
      : false;

    for (const entry of options.entries.slice(1)) {
      const hasHistory =
        entry.providerId !== null &&
        (await this.hasDialogHistoryFile({
          dialogId: entry.dialogId,
          providerId: entry.providerId,
          worktreePath: readDialogWorktreePath(entry),
          workspaceRoot: options.workspaceRoot,
          workspaceSlug: options.workspaceSlug,
        }));
      if (hasHistory && !preferredHasHistory) {
        preferred = entry;
        preferredHasHistory = true;
        continue;
      }
      if (
        hasHistory === preferredHasHistory &&
        entry.updatedAt > preferred.updatedAt
      ) {
        preferred = entry;
      }
    }

    return preferred;
  }

  private async dedupeDialogEntries(options: {
    readonly entries: readonly ContinuityIndexEntry[];
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<readonly ContinuityIndexEntry[]> {
    const grouped = new Map<string, ContinuityIndexEntry[]>();
    const passthrough: ContinuityIndexEntry[] = [];

    for (const entry of options.entries) {
      const key = buildDialogDeduplicationKey(entry);
      if (!key) {
        passthrough.push(entry);
        continue;
      }
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        grouped.set(key, [entry]);
      }
    }

    const deduped = [...passthrough];
    for (const entries of grouped.values()) {
      deduped.push(
        await this.selectPreferredEntry({
          entries,
          workspaceRoot: options.workspaceRoot,
          workspaceSlug: options.workspaceSlug,
        })
      );
    }

    deduped.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
    return deduped;
  }

  async listDialogs(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly runtimeSessions?: readonly Session[];
  }): Promise<readonly ContinuityIndexEntry[]> {
    const indexPath = buildIndexPath(options);
    const index = await readJson<ContinuityIndex>(indexPath);
    let entries: readonly ContinuityIndexEntry[] = [];
    if (index && index.workspaceSlug === options.workspaceSlug) {
      const needsLatestSessionIdBackfill = index.entries.some((entry) => {
        const record = entry as unknown as Record<string, unknown>;
        return !("latestSessionId" in record);
      });
      if (!needsLatestSessionIdBackfill) {
        entries = index.entries;
      }
    }

    if (entries.length === 0) {
      // Fallback: derive entries by scanning chain.json files.
      try {
        const chains = await readContinuityChains(options);
        entries = chains.map((chain) => {
          const last = chain.segments.at(-1) ?? null;
          return {
            stage: chain.stage,
            rootSessionId: chain.rootSessionId,
            dialogId: chain.dialogId ?? chain.rootSessionId,
            updatedAt: chain.updatedAt,
            latestSessionId: last?.sessionId ?? null,
            modelBinding: last?.modelBinding ?? null,
            providerId: last?.providerId ?? null,
            providerSessionId: last?.providerSessionId ?? null,
          };
        });
      } catch (error: unknown) {
        this.logger.warn("Failed to derive continuity dialog index", {
          workspaceSlug: options.workspaceSlug,
          error: error instanceof Error ? error.message : String(error),
        });
        entries = [];
      }
    }

    const projectedDevelopmentTreeDialogs =
      await readProjectedDevelopmentTreeDialogs(options);
    return await this.dedupeDialogEntries({
      entries: reconcileLatestSessionIds(
        [...entries, ...projectedDevelopmentTreeDialogs],
        options.runtimeSessions ?? []
      ),
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    });
  }
}
