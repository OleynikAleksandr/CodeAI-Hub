import type { WorkflowStageId } from "../watcher/watcher-types";

export type WorkflowArtifactFileName =
  | "Final_Description.md"
  | "description.md"
  | "virtual-simulation.md"
  | "module-map.md"
  | "module-map.flow.json"
  | "module-map.agent-baseline.md"
  | "facade-map.md"
  | "facade-map.flow.json"
  | "facade-map.agent-baseline.md";

export type WorkflowArtifactPath = {
  readonly stage: WorkflowStageId;
  readonly fileName: WorkflowArtifactFileName;
  readonly relativePath: string;
  readonly absolutePath: string;
};

export type WorkflowArtifactPathParams = {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly stage: WorkflowStageId;
  readonly fileName: WorkflowArtifactFileName;
};

export type WorkflowArtifactPathResult =
  | { readonly ok: true; readonly value: WorkflowArtifactPath }
  | { readonly ok: false; readonly error: string };
