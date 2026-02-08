import { useSyncExternalStore } from "react";
import type {
  WorkspaceSelectAckPayload,
  WorkspaceSnapshot,
  WorkspaceSnapshotPushPayload,
} from "../core-stream-message-types";

type WorkspaceSnapshotStoreState = {
  readonly activeWorkspaceRoot: string | null;
  readonly activeSelectionId: string | null;
  readonly lastAppliedSequence: number;
  readonly currentSnapshot: WorkspaceSnapshot | null;
};

const INITIAL_STATE: WorkspaceSnapshotStoreState = {
  activeWorkspaceRoot: null,
  activeSelectionId: null,
  lastAppliedSequence: 0,
  currentSnapshot: null,
};

export class WorkspaceSnapshotStore {
  private state: WorkspaceSnapshotStoreState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();

  getState(): WorkspaceSnapshotStoreState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  applySelectAck(ack: WorkspaceSelectAckPayload): void {
    if (ack.status !== "applied") {
      return;
    }
    this.state = {
      activeWorkspaceRoot: ack.workspaceRoot,
      activeSelectionId: ack.selectionId,
      lastAppliedSequence: 0,
      currentSnapshot: null,
    };
    this.emit();
  }

  applySnapshot(push: WorkspaceSnapshotPushPayload): void {
    if (
      this.state.activeWorkspaceRoot !== push.workspaceRoot ||
      this.state.activeSelectionId !== push.selectionId ||
      push.sequence <= this.state.lastAppliedSequence
    ) {
      return;
    }

    this.state = {
      ...this.state,
      lastAppliedSequence: push.sequence,
      currentSnapshot: push.snapshot,
    };
    this.emit();
  }

  getServerLock(sessionId: string): boolean {
    const session = this.state.currentSnapshot?.sessions[sessionId];
    if (!session) {
      return false;
    }
    return (
      session.turnState !== "idle" ||
      session.continuityLockActive ||
      session.continuityLockTransition?.awaitingBootstrapTurn === true
    );
  }

  clear(): void {
    this.state = INITIAL_STATE;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const workspaceSnapshotStore = new WorkspaceSnapshotStore();

export const useWorkspaceSnapshot = (): WorkspaceSnapshotStoreState =>
  useSyncExternalStore(
    workspaceSnapshotStore.subscribe.bind(workspaceSnapshotStore),
    workspaceSnapshotStore.getState.bind(workspaceSnapshotStore),
    workspaceSnapshotStore.getState.bind(workspaceSnapshotStore)
  );
