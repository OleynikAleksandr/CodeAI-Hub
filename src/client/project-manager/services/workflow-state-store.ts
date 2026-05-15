import { useSyncExternalStore } from "react";
import { api } from "../api";
import { buildWorkflowStateChangeToken } from "./workflow-state-change-token";
import type { WorkflowStateSnapshot } from "./workflow-state-client";

const FAST_POLL_MS = 3_000;
const SLOW_POLL_MS = 10_000;
const BACKGROUND_POLL_MS = 30_000;

export type WorkflowStatePollingMode = "foreground" | "background" | "hidden";

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
  private pollingGeneration = 0;
  private pollInFlight = false;
  private fastPolling = true;
  private pendingImmediatePoll = false;
  private pollingMode: WorkflowStatePollingMode = "foreground";

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

  setVisibilityMode(mode: WorkflowStatePollingMode): void {
    if (this.pollingMode === mode) {
      return;
    }
    this.pollingMode = mode;
    const { workspaceSlug, workspacePath } = this.state;
    if (!(workspaceSlug && workspacePath)) {
      return;
    }
    if (mode === "foreground") {
      this.requestImmediatePoll();
      return;
    }
    this.pendingImmediatePoll = false;
    this.scheduleNextPoll(this.pollingGeneration, workspaceSlug, workspacePath);
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
    this.fastPolling = true;
    if (this.pollingMode === "hidden") {
      return;
    }
    this.requestImmediatePoll();
  }

  private stopPolling(): void {
    this.pollingGeneration += 1;
    this.pollInFlight = false;
    this.pendingImmediatePoll = false;
    this.fastPolling = true;
    window.clearTimeout(this.timer);
    this.timer = 0;
  }

  private resolveIntervalMs(): number | null {
    if (this.pollingMode === "hidden") {
      return null;
    }
    if (this.pollingMode === "background") {
      return BACKGROUND_POLL_MS;
    }
    return this.fastPolling ? FAST_POLL_MS : SLOW_POLL_MS;
  }

  private scheduleNextPoll(
    generation: number,
    workspaceSlug: string,
    workspacePath: string
  ): void {
    window.clearTimeout(this.timer);
    this.timer = 0;
    if (
      generation !== this.pollingGeneration ||
      this.state.workspaceSlug !== workspaceSlug ||
      this.state.workspacePath !== workspacePath
    ) {
      return;
    }
    const intervalMs = this.resolveIntervalMs();
    if (intervalMs === null) {
      return;
    }
    this.timer = window.setTimeout(() => {
      void this.poll(generation, workspaceSlug, workspacePath);
    }, intervalMs);
  }

  private requestImmediatePoll(): void {
    const { workspaceSlug, workspacePath } = this.state;
    if (!(workspaceSlug && workspacePath)) {
      return;
    }
    window.clearTimeout(this.timer);
    this.timer = 0;
    if (this.pollingMode === "hidden") {
      return;
    }
    if (this.pollInFlight) {
      this.pendingImmediatePoll = true;
      return;
    }
    void this.poll(this.pollingGeneration, workspaceSlug, workspacePath);
  }

  private async poll(
    generation: number,
    workspaceSlug: string,
    workspacePath: string
  ): Promise<void> {
    if (this.pollingMode === "hidden" || generation !== this.pollingGeneration) {
      return;
    }
    this.pollInFlight = true;
    try {
      const snapshot = await api.getWorkflowState(workspaceSlug, workspacePath);
      if (
        generation !== this.pollingGeneration ||
        this.state.workspaceSlug !== workspaceSlug ||
        this.state.workspacePath !== workspacePath
      ) {
        return;
      }
      // Skip emit if projected workflow data has not changed. Some derived
      // readiness fields come from filesystem projection and can change without
      // mutating the root workflow updatedAt timestamp.
      const prev = this.state.snapshot;
      const changed =
        !this.state.loaded ||
        !prev ||
        !snapshot ||
        buildWorkflowStateChangeToken(prev) !==
          buildWorkflowStateChangeToken(snapshot);
      this.state = {
        workspaceSlug,
        workspacePath,
        snapshot,
        loaded: true,
      };
      if (changed) {
        this.emit();
      }
      if (this.fastPolling && snapshot) {
        this.fastPolling = false;
      }
    } catch {
      // Ignore polling errors; next scheduled tick will retry.
    } finally {
      if (generation !== this.pollingGeneration) {
        this.pollInFlight = false;
        return;
      }
      this.pollInFlight = false;
      if (
        this.pendingImmediatePoll &&
        this.state.workspaceSlug === workspaceSlug &&
        this.state.workspacePath === workspacePath
      ) {
        this.pendingImmediatePoll = false;
        void this.poll(generation, workspaceSlug, workspacePath);
        return;
      }
      this.pendingImmediatePoll = false;
      this.scheduleNextPoll(generation, workspaceSlug, workspacePath);
    }
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
