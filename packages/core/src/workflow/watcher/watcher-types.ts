import type { Logger } from "../../telemetry/logger";

export type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules";

export type WorkflowWatcherEventBase = {
  readonly timestamp: string;
  readonly workspaceSlug: string;
};

export type WorkflowRunCreatedEvent = WorkflowWatcherEventBase & {
  readonly type: "workflow.run.created";
  readonly stage: WorkflowStageId;
};

export type WorkflowArtifactWrittenEvent = WorkflowWatcherEventBase & {
  readonly type: "workflow.artifact.written";
  readonly stage: WorkflowStageId;
  readonly filePath: string;
};

export type WorkflowStageCompletedEvent = WorkflowWatcherEventBase & {
  readonly type: "workflow.stage.completed";
  readonly stage: WorkflowStageId;
};

export type WorkflowStageInvalidatedEvent = WorkflowWatcherEventBase & {
  readonly type: "workflow.stage.invalidated";
  readonly stage: WorkflowStageId;
  readonly reason?: string;
};

export type WorkflowGateEvent = WorkflowWatcherEventBase & {
  readonly type:
    | "workflow.gate.started"
    | "workflow.gate.passed"
    | "workflow.gate.failed";
  readonly gateId: string;
  readonly stage?: WorkflowStageId;
  readonly detail?: string;
};

export type WorkflowWatcherEvent =
  | WorkflowRunCreatedEvent
  | WorkflowArtifactWrittenEvent
  | WorkflowStageCompletedEvent
  | WorkflowStageInvalidatedEvent
  | WorkflowGateEvent;

export type WorkflowWatcherListener = (event: WorkflowWatcherEvent) => void;

export type WorkflowWatcherOptions = {
  readonly workspaceSlug: string;
  readonly watchRoot: string;
  readonly logger: Logger;
  readonly clock?: () => string;
  readonly enableFsWatch?: boolean;
};
