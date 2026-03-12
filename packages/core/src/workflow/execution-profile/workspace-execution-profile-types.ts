import type { WorkflowStageId } from "../watcher/watcher-types";

export const WORKSPACE_EXECUTION_PROFILE_VERSION = 1 as const;

export type WorkspaceExecutionProfileSnapshot = {
  readonly version: typeof WORKSPACE_EXECUTION_PROFILE_VERSION;
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly lockedAt: string;
  readonly lockedFromStage: WorkflowStageId;
  readonly providerId: string;
  readonly modelId: string;
};

export type WorkspaceExecutionProfileSeed = {
  readonly providerId: string;
  readonly modelId: string;
  readonly lockedFromStage?: WorkflowStageId;
  readonly lockedAt?: string;
};
