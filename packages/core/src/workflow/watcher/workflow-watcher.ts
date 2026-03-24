import { existsSync, type FSWatcher, watch } from "node:fs";
import path from "node:path";
import type { Logger } from "../../telemetry/logger";
import type {
  WorkflowArtifactWrittenEvent,
  WorkflowRunCreatedEvent,
  WorkflowStageId,
  WorkflowWatcherEvent,
  WorkflowWatcherListener,
  WorkflowWatcherOptions,
} from "./watcher-types";

const WORKFLOW_STAGE_SET = new Set<WorkflowStageId>([
  "description",
  "virtual_simulation",
  "diagram_modules",
]);

const supportsRecursiveWatch = (): boolean =>
  process.platform === "darwin" || process.platform === "win32";

type WorkflowPathMatch = {
  readonly stage: WorkflowStageId;
  readonly filePath?: string;
};

const isWorkflowStage = (value: string): value is WorkflowStageId =>
  WORKFLOW_STAGE_SET.has(value as WorkflowStageId);

const normalizeFileName = (
  fileName: string | Buffer | null | undefined
): string | null => {
  if (!fileName) {
    return null;
  }
  if (typeof fileName === "string") {
    return fileName.trim();
  }
  return fileName.toString("utf8").trim();
};

const shouldIgnorePath = (relativePath: string): boolean => {
  const baseName = path.basename(relativePath);
  if (!baseName) {
    return true;
  }
  return baseName.startsWith(".") || baseName.endsWith("~");
};

const parseWorkflowPath = (relativePath: string): WorkflowPathMatch | null => {
  const segments = path
    .normalize(relativePath)
    .split(path.sep)
    .filter((segment) => segment.length > 0);
  if (segments.length < 1) {
    return null;
  }
  const [stage, maybeRunsMarker, maybeRunSlug, ...rest] = segments;
  if (!isWorkflowStage(stage)) {
    return null;
  }

  if (maybeRunsMarker === "runs") {
    if (!maybeRunSlug) {
      return null;
    }
    const filePath = rest.length > 0 ? rest.join(path.sep) : undefined;
    return { stage, filePath };
  }

  const filePath =
    segments.length > 1 ? segments.slice(1).join(path.sep) : undefined;
  return { stage, filePath };
};

export class WorkflowWatcher {
  private readonly watchRoot: string;
  private readonly workspaceSlug: string;
  private readonly logger: Logger;
  private readonly listeners = new Set<WorkflowWatcherListener>();
  private readonly clock: () => string;
  private readonly enableFsWatch: boolean;

  private watcher: FSWatcher | null = null;
  private lastEvent: WorkflowWatcherEvent | null = null;

  constructor(options: WorkflowWatcherOptions) {
    this.watchRoot = options.watchRoot;
    this.workspaceSlug = options.workspaceSlug;
    this.logger = options.logger;
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.enableFsWatch = options.enableFsWatch ?? true;
  }

  start(): void {
    if (!this.enableFsWatch || this.watcher) {
      return;
    }

    if (!existsSync(this.watchRoot)) {
      this.logger.warn("Workflow watcher root not found", {
        watchRoot: this.watchRoot,
        workspaceSlug: this.workspaceSlug,
      });
      return;
    }

    const watcher = watch(
      this.watchRoot,
      { recursive: supportsRecursiveWatch() },
      (eventType, fileName) => {
        this.handleFsEvent(eventType, fileName);
      }
    );

    watcher.on("error", (error) => {
      this.logger.error("Workflow watcher error", error as Error, {
        watchRoot: this.watchRoot,
        workspaceSlug: this.workspaceSlug,
      });
    });

    this.watcher = watcher;
    this.logger.info("Workflow watcher started", {
      watchRoot: this.watchRoot,
      workspaceSlug: this.workspaceSlug,
      recursive: supportsRecursiveWatch(),
    });
  }

  stop(): void {
    if (!this.watcher) {
      return;
    }
    this.watcher.close();
    this.watcher = null;
    this.logger.info("Workflow watcher stopped", {
      watchRoot: this.watchRoot,
      workspaceSlug: this.workspaceSlug,
    });
  }

  subscribe(listener: WorkflowWatcherListener, replay = false): () => void {
    this.listeners.add(listener);
    if (replay && this.lastEvent) {
      listener(this.lastEvent);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: WorkflowWatcherEvent): void {
    this.lastEvent = event;
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  snapshot(): WorkflowWatcherEvent | null {
    return this.lastEvent;
  }

  private handleFsEvent(
    eventType: string,
    fileName: string | Buffer | null | undefined
  ): void {
    const normalized = normalizeFileName(fileName);
    if (!normalized || shouldIgnorePath(normalized)) {
      return;
    }

    const match = parseWorkflowPath(normalized);
    if (!match) {
      return;
    }

    if (match.filePath) {
      this.emit(this.createArtifactEvent(match, normalized));
      return;
    }

    if (eventType === "rename") {
      this.emit(this.createRunCreatedEvent(match));
    }
  }

  private createRunCreatedEvent(
    match: WorkflowPathMatch
  ): WorkflowRunCreatedEvent {
    return {
      type: "workflow.run.created",
      timestamp: this.clock(),
      workspaceSlug: this.workspaceSlug,
      stage: match.stage,
    };
  }

  private createArtifactEvent(
    match: WorkflowPathMatch,
    relativePath: string
  ): WorkflowArtifactWrittenEvent {
    return {
      type: "workflow.artifact.written",
      timestamp: this.clock(),
      workspaceSlug: this.workspaceSlug,
      stage: match.stage,
      filePath: relativePath,
    };
  }
}
