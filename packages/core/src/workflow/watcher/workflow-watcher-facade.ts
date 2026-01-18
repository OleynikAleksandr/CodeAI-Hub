import type {
  WorkflowWatcherEvent,
  WorkflowWatcherListener,
  WorkflowWatcherOptions,
} from "./watcher-types";
import { WorkflowWatcher } from "./workflow-watcher";

export class WorkflowWatcherFacade {
  private readonly watcher: WorkflowWatcher;

  constructor(options: WorkflowWatcherOptions) {
    this.watcher = new WorkflowWatcher(options);
  }

  start(): void {
    this.watcher.start();
  }

  stop(): void {
    this.watcher.stop();
  }

  subscribe(listener: WorkflowWatcherListener, replay = false): () => void {
    return this.watcher.subscribe(listener, replay);
  }

  emit(event: WorkflowWatcherEvent): void {
    this.watcher.emit(event);
  }

  snapshot(): WorkflowWatcherEvent | null {
    return this.watcher.snapshot();
  }
}
