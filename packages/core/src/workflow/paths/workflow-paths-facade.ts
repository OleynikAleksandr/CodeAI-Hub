import { resolveWorkflowArtifactPaths } from "./workflow-artifact-paths";
import type {
  WorkflowArtifactPathParams,
  WorkflowArtifactPathResult,
} from "./workflow-paths-types";

export class WorkflowPathsFacade {
  resolveArtifactPath(
    params: WorkflowArtifactPathParams
  ): WorkflowArtifactPathResult {
    return resolveWorkflowArtifactPaths(params);
  }
}
