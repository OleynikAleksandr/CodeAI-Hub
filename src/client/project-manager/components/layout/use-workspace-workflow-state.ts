import { useSyncExternalStore } from "react";
import { api } from "../../api";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";

const FAST_POLL_INTERVAL_MS = 3_000;
const SLOW_POLL_INTERVAL_MS = 15_000;

type WorkspaceWorkflowStateEntry = {
  readonly workspaceSlug: string;
  readonly workspacePath?: string;
  readonly listeners: Set<() => void>;
  state: WorkflowStateSnapshot | null;
  fastPolling: boolean;
  inflight: boolean;
  subscribers: number;
  timer: number;
};

const entries = new Map<string, WorkspaceWorkflowStateEntry>();

const buildEntryKey = (
  workspaceSlug: string,
  workspacePath?: string
): string => `${workspaceSlug}::${workspacePath ?? ""}`;

const notifyEntry = (entry: WorkspaceWorkflowStateEntry): void => {
  for (const listener of entry.listeners) {
    listener();
  }
};

const stopEntryTimer = (entry: WorkspaceWorkflowStateEntry): void => {
  if (entry.timer === 0) {
    return;
  }
  window.clearInterval(entry.timer);
  entry.timer = 0;
};

const scheduleEntryTimer = (entry: WorkspaceWorkflowStateEntry): void => {
  stopEntryTimer(entry);
  entry.timer = window.setInterval(() => {
    void refreshEntry(entry);
  }, entry.fastPolling ? FAST_POLL_INTERVAL_MS : SLOW_POLL_INTERVAL_MS);
};

const refreshEntry = async (
  entry: WorkspaceWorkflowStateEntry
): Promise<void> => {
  if (entry.inflight) {
    return;
  }
  entry.inflight = true;
  try {
    entry.state = await api.getWorkflowState(
      entry.workspaceSlug,
      entry.workspacePath
    );
    if (entry.state && entry.fastPolling) {
      entry.fastPolling = false;
      scheduleEntryTimer(entry);
    }
    notifyEntry(entry);
  } finally {
    entry.inflight = false;
  }
};

const getOrCreateEntry = (
  workspaceSlug: string,
  workspacePath?: string
): WorkspaceWorkflowStateEntry => {
  const entryKey = buildEntryKey(workspaceSlug, workspacePath);
  const existing = entries.get(entryKey);
  if (existing) {
    return existing;
  }
  const entry: WorkspaceWorkflowStateEntry = {
    workspaceSlug,
    workspacePath,
    listeners: new Set(),
    state: null,
    fastPolling: true,
    inflight: false,
    subscribers: 0,
    timer: 0,
  };
  entries.set(entryKey, entry);
  return entry;
};

export const useWorkspaceWorkflowState = (params: {
  readonly enabled: boolean;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
}): WorkflowStateSnapshot | null => {
  const entryKey =
    params.enabled && params.workspaceSlug
      ? buildEntryKey(params.workspaceSlug, params.workspacePath)
      : null;

  return useSyncExternalStore(
    (onStoreChange) => {
      if (!(params.enabled && params.workspaceSlug && entryKey)) {
        return () => undefined;
      }
      const entry = getOrCreateEntry(params.workspaceSlug, params.workspacePath);
      entry.subscribers += 1;
      entry.listeners.add(onStoreChange);
      if (entry.timer === 0) {
        void refreshEntry(entry);
        scheduleEntryTimer(entry);
      }
      return () => {
        entry.listeners.delete(onStoreChange);
        entry.subscribers = Math.max(0, entry.subscribers - 1);
        if (entry.subscribers > 0) {
          return;
        }
        stopEntryTimer(entry);
        entries.delete(entryKey);
      };
    },
    () => {
      if (!entryKey) {
        return null;
      }
      return entries.get(entryKey)?.state ?? null;
    },
    () => null
  );
};
