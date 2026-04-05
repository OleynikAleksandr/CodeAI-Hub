import type { WorkflowStageId } from "../watcher/watcher-types";

export type WorkflowArtifactFileName =
  | "Final_Description.md"
  | "description.md"
  | "virtual-simulation.md"
  | "product-parts.index.md"
  | "product-part.md"
  | "module-map.flow.json"
  | "foundation-envelope.md";

export interface WorkflowArtifactPath {
  readonly absolutePath: string;
  readonly fileName: WorkflowArtifactFileName;
  readonly partId?: string;
  readonly relativePath: string;
  readonly stage: WorkflowStageId;
}

export interface WorkflowArtifactPathParams {
  readonly fileName: WorkflowArtifactFileName;
  readonly partId?: string;
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export type WorkflowArtifactPathResult =
  | { readonly ok: true; readonly value: WorkflowArtifactPath }
  | { readonly ok: false; readonly error: string };
