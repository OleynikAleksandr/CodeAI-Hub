import { useSyncExternalStore } from "react";
import { api } from "../api";
import type { WorkflowStateSnapshot } from "./workflow-state-client";

const FAST_POLL_MS = 3_000;
const SLOW_POLL_MS = 10_000;

type WorkflowStateStoreState = {
  readonly workspaceSlug: string | null;
  readonly workspacePath: string | null;
  readonly snapshot: WorkflowStateSnapshot | null;
  readonly loaded: boolean;
};

const INITIAL_STATE: WorkflowStateStoreState = {
  workspaceSlug: null,
  workspacePath: null,
  snapshot: null,
  loaded: false,
};

/**
 * Singleton store that polls workflow state for the active workspace.
 * Both MainArea and WorkspaceTree subscribe to the same store,
 * eliminating the split-brain caused by two independent polling cycles.
 */
class WorkflowStateStore {
  private state: WorkflowStateStoreState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();
  private timer = 0;
  private cancelled = false;

  getState(): WorkflowStateStoreState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Activate polling for a workspace. Clears previous state if slug changed. */
  activate(workspaceSlug: string, workspacePath: string): void {
    if (
      this.state.workspaceSlug === workspaceSlug &&
      this.state.workspacePath === workspacePath
    ) {
      return;
    }
    this.stopPolling();
    // Set intermediate state without emitting — subscribers only see
    // real snapshots, never the null-snapshot transition that would
    // cause a render-cycle with stale hasDescriptionSession.
    this.state = { workspaceSlug, workspacePath, snapshot: null, loaded: false };
    this.startPolling(workspaceSlug, workspacePath);
  }

  /** Stop polling and clear state. */
  deactivate(): void {
    this.stopPolling();
    if (this.state.workspaceSlug !== null) {
      this.state = INITIAL_STATE;
      this.emit();
    }
  }

  private startPolling(slug: string, wPath: string): void {
    this.cancelled = false;
    let fast = true;
    const poll = async () => {
      const snapshot = await api.getWorkflowState(slug, wPath);
      if (this.cancelled || this.state.workspaceSlug !== slug) return;
      this.state = { workspaceSlug: slug, workspacePath: wPath, snapshot, loaded: true };
      this.emit();
      if (fast && snapshot) {
        fast = false;
        window.clearInterval(this.timer);
        this.timer = window.setInterval(poll, SLOW_POLL_MS);
      }
    };
    poll();
    this.timer = window.setInterval(poll, FAST_POLL_MS);
  }

  private stopPolling(): void {
    this.cancelled = true;
    window.clearInterval(this.timer);
    this.timer = 0;
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const workflowStateStore = new WorkflowStateStore();

export const useWorkflowStateSnapshot = (): WorkflowStateStoreState =>
  useSyncExternalStore(
    workflowStateStore.subscribe.bind(workflowStateStore),
    workflowStateStore.getState.bind(workflowStateStore),
    workflowStateStore.getState.bind(workflowStateStore)
  );
