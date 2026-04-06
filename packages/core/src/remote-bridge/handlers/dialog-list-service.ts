import { readFile, stat } from "node:fs/promises";
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

const CONTINUITY_ROOT = ".codeai-hub";
const CONTINUITY_DIR = "continuity";
const INDEX_FILE_NAME = "index.json";
const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");

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

const hasProviderSessionId = (
  value: string | null | undefined
): value is string => typeof value === "string" && value.trim().length > 0;

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

export class DialogListService {
  private readonly logger: Logger;

  constructor(options: { readonly logger: Logger }) {
    this.logger = options.logger;
  }

  private async hasDialogHistoryFile(options: {
    readonly dialogId: string;
    readonly providerId: string;
    readonly workspaceRoot: string;
  }): Promise<boolean> {
    const filePath = buildSessionFilePath({
      rootDirectory: SESSION_ROOT,
      workspaceSlug: sanitizeWorkspaceSlug(options.workspaceRoot),
      provider: options.providerId,
      sessionId: sanitizeWorkspaceSlug(options.dialogId),
    });

    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async selectPreferredEntry(options: {
    readonly entries: readonly ContinuityIndexEntry[];
    readonly workspaceRoot: string;
  }): Promise<ContinuityIndexEntry> {
    let preferred = options.entries[0];
    let preferredHasHistory = preferred?.providerId
      ? await this.hasDialogHistoryFile({
          dialogId: preferred.dialogId,
          providerId: preferred.providerId,
          workspaceRoot: options.workspaceRoot,
        })
      : false;

    for (const entry of options.entries.slice(1)) {
      const hasHistory =
        entry.providerId !== null &&
        (await this.hasDialogHistoryFile({
          dialogId: entry.dialogId,
          providerId: entry.providerId,
          workspaceRoot: options.workspaceRoot,
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

    return await this.dedupeDialogEntries({
      entries: reconcileLatestSessionIds(
        entries,
        options.runtimeSessions ?? []
      ),
      workspaceRoot: options.workspaceRoot,
    });
  }
}
