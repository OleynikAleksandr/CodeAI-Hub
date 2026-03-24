import type { WorkflowStageId } from "../watcher/watcher-types";

export type WorkflowArtifactFileName =
  | "Final_Description.md"
  | "description.md"
  | "virtual-simulation.md"
  | "product-parts.index.md"
  | "product-part.md"
  | "module-map.flow.json";

export type WorkflowArtifactPath = {
  readonly stage: WorkflowStageId;
  readonly fileName: WorkflowArtifactFileName;
  readonly partId?: string;
  readonly relativePath: string;
  readonly absolutePath: string;
};

export type WorkflowArtifactPathParams = {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly stage: WorkflowStageId;
  readonly fileName: WorkflowArtifactFileName;
  readonly partId?: string;
};

export type WorkflowArtifactPathResult =
  | { readonly ok: true; readonly value: WorkflowArtifactPath }
  | { readonly ok: false; readonly error: string };
