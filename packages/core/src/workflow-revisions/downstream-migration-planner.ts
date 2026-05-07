import type {
  DiagramRevisionChange,
  DiagramRevisionDiff,
} from "./diagram-revision-diff";

export type DownstreamMigrationStage = "application_skeleton" | "quality_gates";

export type DownstreamMigrationPriority = "high" | "medium";

export interface DownstreamMigrationTask {
  readonly changeId: string;
  readonly priority: DownstreamMigrationPriority;
  readonly reason: string;
  readonly stage: DownstreamMigrationStage;
  readonly task: string;
}

export interface DownstreamMigrationPlan {
  readonly baselineRevision: string;
  readonly currentRevision: string;
  readonly schema: "codeai-downstream-migration-plan-v1";
  readonly tasks: readonly DownstreamMigrationTask[];
}

export const planDownstreamWorkflowMigrations = (
  diff: DiagramRevisionDiff
): DownstreamMigrationPlan => ({
  schema: "codeai-downstream-migration-plan-v1",
  baselineRevision: diff.baselineRevision,
  currentRevision: diff.currentRevision,
  tasks: diff.changes.flatMap(createTasksForChange),
});

const createTasksForChange = (
  change: DiagramRevisionChange
): readonly DownstreamMigrationTask[] => {
  const tasks: DownstreamMigrationTask[] = [];
  if (change.kind !== "facade_boundary") {
    tasks.push(createSkeletonTask(change));
  }
  if (
    change.kind === "module" ||
    change.kind === "cluster" ||
    change.kind === "facade_boundary"
  ) {
    tasks.push(createQualityGateTask(change));
  }
  return tasks;
};

const createSkeletonTask = (
  change: DiagramRevisionChange
): DownstreamMigrationTask => ({
  changeId: createChangeId(change),
  priority: change.action === "removed" ? "high" : "medium",
  reason: change.summary,
  stage: "application_skeleton",
  task: createSkeletonTaskText(change),
});

const createQualityGateTask = (
  change: DiagramRevisionChange
): DownstreamMigrationTask => ({
  changeId: createChangeId(change),
  priority: change.kind === "facade_boundary" ? "high" : "medium",
  reason: change.summary,
  stage: "quality_gates",
  task: createQualityGateTaskText(change),
});

const createSkeletonTaskText = (change: DiagramRevisionChange): string => {
  const subject = `${change.kind}:${change.id}`;
  switch (change.action) {
    case "added":
      return `Map new ${subject} into application-skeleton-map.json before materialization.`;
    case "removed":
      return `Mark removed ${subject} as obsolete and plan filesystem cleanup.`;
    case "renamed":
      return `Rename ${change.fromId ?? change.id} to ${change.id} in skeleton paths and materialized path records.`;
    case "changed":
      return `Review skeleton mapping for changed ${subject}.`;
    default:
      return assertNever(change.action);
  }
};

const createQualityGateTaskText = (change: DiagramRevisionChange): string => {
  const subject = `${change.kind}:${change.id}`;
  if (change.kind === "facade_boundary") {
    return `Revalidate public-entry/facade gates for ${subject}.`;
  }
  if (change.action === "removed") {
    return `Remove or defer gate coverage for obsolete ${subject}.`;
  }
  return `Review quality gate coverage for ${subject}.`;
};

const createChangeId = (change: DiagramRevisionChange): string =>
  `${change.kind}:${change.action}:${change.fromId ?? change.id}:${change.id}`;

const assertNever = (value: never): never => {
  throw new Error(`Unsupported migration action: ${value}`);
};
