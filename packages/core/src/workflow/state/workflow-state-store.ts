import type {
  WorkflowStageId,
  WorkflowWatcherEvent,
} from "../watcher/watcher-types";
import type {
  WorkflowArtifactState,
  WorkflowGateState,
  WorkflowGateStatus,
  WorkflowStageState,
  WorkflowStageStatus,
  WorkflowState,
  WorkflowStateListener,
} from "./workflow-state-types";

const WORKFLOW_STAGES: WorkflowStageId[] = [
  "description",
  "virtual_simulation",
  "diagram_modules",
];

const createInitialStageState = (
  stage: WorkflowStageId,
  timestamp: string
): WorkflowStageState => ({
  stage,
  status: "idle",
  artifacts: [],
  gates: [],
  updatedAt: timestamp,
});

const createInitialState = (
  workspaceSlug: string,
  timestamp: string
): WorkflowState => {
  const stages = WORKFLOW_STAGES.reduce<
    Record<WorkflowStageId, WorkflowStageState>
  >(
    (accumulator, stage) => {
      accumulator[stage] = createInitialStageState(stage, timestamp);
      return accumulator;
    },
    {} as Record<WorkflowStageId, WorkflowStageState>
  );

  return {
    workspaceSlug,
    stages,
    gates: [],
    updatedAt: timestamp,
  };
};

const upsertArtifact = (
  artifacts: readonly WorkflowArtifactState[],
  path: string,
  timestamp: string
): WorkflowArtifactState[] => {
  const index = artifacts.findIndex((entry) => entry.path === path);
  if (index < 0) {
    return [...artifacts, { path, updatedAt: timestamp }];
  }
  return artifacts.map((entry, idx) =>
    idx === index ? { ...entry, updatedAt: timestamp } : entry
  );
};

const resolveGateStatus = (
  eventType: WorkflowWatcherEvent["type"]
): WorkflowGateStatus | null => {
  if (eventType === "workflow.gate.started") {
    return "started";
  }
  if (eventType === "workflow.gate.passed") {
    return "passed";
  }
  if (eventType === "workflow.gate.failed") {
    return "failed";
  }
  return null;
};

const isGateEvent = (
  event: WorkflowWatcherEvent
): event is Extract<
  WorkflowWatcherEvent,
  {
    readonly type:
      | "workflow.gate.started"
      | "workflow.gate.passed"
      | "workflow.gate.failed";
  }
> =>
  event.type === "workflow.gate.started" ||
  event.type === "workflow.gate.passed" ||
  event.type === "workflow.gate.failed";

const upsertGate = (
  gates: readonly WorkflowGateState[],
  nextGate: WorkflowGateState
): WorkflowGateState[] => {
  const index = gates.findIndex(
    (gate) => gate.gateId === nextGate.gateId && gate.stage === nextGate.stage
  );
  if (index < 0) {
    return [...gates, nextGate];
  }
  return gates.map((gate, idx) => (idx === index ? nextGate : gate));
};

const resolveStageStatus = (
  current: WorkflowStageStatus,
  eventType: WorkflowWatcherEvent["type"]
): WorkflowStageStatus => {
  if (eventType === "workflow.stage.completed") {
    return "completed";
  }
  if (eventType === "workflow.stage.invalidated") {
    return "invalid";
  }
  if (eventType === "workflow.run.created") {
    return "in_progress";
  }
  if (eventType === "workflow.artifact.written" && current !== "in_progress") {
    return "in_progress";
  }
  return current;
};

const shouldMarkOutdated = (stage: WorkflowStageState): boolean =>
  stage.status === "completed" ||
  stage.status === "in_progress" ||
  stage.status === "outdated";

const markDownstreamOutdated = (
  stages: Record<WorkflowStageId, WorkflowStageState>,
  stage: WorkflowStageId,
  timestamp: string
): Record<WorkflowStageId, WorkflowStageState> => {
  const stageIndex = WORKFLOW_STAGES.indexOf(stage);
  if (stageIndex < 0 || stageIndex === WORKFLOW_STAGES.length - 1) {
    return stages;
  }

  let didUpdate = false;
  const nextStages: Record<WorkflowStageId, WorkflowStageState> = {
    ...stages,
  };

  for (let index = stageIndex + 1; index < WORKFLOW_STAGES.length; index += 1) {
    const downstreamStage = WORKFLOW_STAGES[index];
    const downstreamState = stages[downstreamStage];
    const isOutdatedCandidate =
      downstreamState && shouldMarkOutdated(downstreamState);
    if (!isOutdatedCandidate) {
      continue;
    }

    nextStages[downstreamStage] = {
      ...downstreamState,
      status: "outdated",
      updatedAt: timestamp,
    };
    didUpdate = true;
  }

  return didUpdate ? nextStages : stages;
};

const updateStageState = (
  stageState: WorkflowStageState,
  event: WorkflowWatcherEvent
): WorkflowStageState => {
  if (event.type === "workflow.run.created") {
    return {
      ...stageState,
      status: resolveStageStatus(stageState.status, event.type),
      artifacts: [],
      gates: [],
      updatedAt: event.timestamp,
    };
  }

  if (event.type === "workflow.artifact.written") {
    return {
      ...stageState,
      status: resolveStageStatus(stageState.status, event.type),
      artifacts: upsertArtifact(
        stageState.artifacts,
        event.filePath,
        event.timestamp
      ),
      updatedAt: event.timestamp,
    };
  }

  if (event.type === "workflow.stage.completed") {
    return {
      ...stageState,
      status: resolveStageStatus(stageState.status, event.type),
      updatedAt: event.timestamp,
    };
  }

  if (event.type === "workflow.stage.invalidated") {
    return {
      ...stageState,
      status: resolveStageStatus(stageState.status, event.type),
      updatedAt: event.timestamp,
    };
  }

  if (isGateEvent(event) && event.stage === stageState.stage) {
    const status = resolveGateStatus(event.type);
    if (!status) {
      return stageState;
    }
    return {
      ...stageState,
      gates: upsertGate(stageState.gates, {
        gateId: event.gateId,
        status,
        updatedAt: event.timestamp,
        stage: event.stage,
        detail: event.detail,
      }),
      updatedAt: event.timestamp,
    };
  }

  return stageState;
};

export class WorkflowStateStore {
  private readonly workspaceSlug: string;
  private readonly listeners = new Set<WorkflowStateListener>();
  private state: WorkflowState;

  constructor(options: {
    readonly workspaceSlug: string;
    readonly clock?: () => string;
  }) {
    this.workspaceSlug = options.workspaceSlug;
    const timestamp = options.clock
      ? options.clock()
      : new Date().toISOString();
    this.state = createInitialState(this.workspaceSlug, timestamp);
  }

  apply(event: WorkflowWatcherEvent): WorkflowState {
    const stage = "stage" in event ? event.stage : undefined;
    const nextStages = stage
      ? {
          ...this.state.stages,
          [stage]: updateStageState(this.state.stages[stage], event),
        }
      : this.state.stages;

    const nextGates =
      isGateEvent(event) && !event.stage
        ? upsertGate(this.state.gates, {
            gateId: event.gateId,
            status: resolveGateStatus(event.type) ?? "started",
            updatedAt: event.timestamp,
            detail: event.detail,
          })
        : this.state.gates;

    const nextStagesWithOutdated =
      event.type === "workflow.artifact.written"
        ? markDownstreamOutdated(nextStages, event.stage, event.timestamp)
        : nextStages;

    const nextState: WorkflowState = {
      ...this.state,
      stages: nextStagesWithOutdated,
      gates: nextGates,
      updatedAt: event.timestamp,
    };

    this.state = nextState;
    this.emit(nextState);
    return nextState;
  }

  snapshot(): WorkflowState {
    return this.state;
  }

  subscribe(listener: WorkflowStateListener, replay = true): () => void {
    this.listeners.add(listener);
    if (replay) {
      listener(this.state);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(state: WorkflowState): void {
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
