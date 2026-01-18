import type { WorkflowWatcherEvent } from "../watcher/watcher-types";
import { WorkflowStateStore } from "./workflow-state-store";
import type {
  WorkflowState,
  WorkflowStateListener,
} from "./workflow-state-types";

export class WorkflowStateFacade {
  private readonly store: WorkflowStateStore;

  constructor(options: {
    readonly workspaceSlug: string;
    readonly clock?: () => string;
  }) {
    this.store = new WorkflowStateStore(options);
  }

  apply(event: WorkflowWatcherEvent): WorkflowState {
    return this.store.apply(event);
  }

  snapshot(): WorkflowState {
    return this.store.snapshot();
  }

  subscribe(listener: WorkflowStateListener, replay = true): () => void {
    return this.store.subscribe(listener, replay);
  }
}
