import { createManagedWorkspacePaths } from "./managed-workspace-paths";
import type {
  ManagedWorkspacePathRequest,
  ManagedWorkspacePathResult,
  ManagedWorkspacePaths,
} from "./managed-workspace-types";

export class ManagedWorkspaceFacade {
  resolvePaths(
    request: ManagedWorkspacePathRequest
  ): ManagedWorkspacePathResult {
    const workspaceRoot = request.workspaceRoot.trim();
    if (!workspaceRoot) {
      return { ok: false, error: "workspaceRoot is required" };
    }
    return { ok: true, value: createManagedWorkspacePaths(workspaceRoot) };
  }

  resolvePathsOrThrow(
    request: ManagedWorkspacePathRequest
  ): ManagedWorkspacePaths {
    const result = this.resolvePaths(request);
    if (!result.ok) {
      throw new Error(result.error);
    }
    return result.value;
  }
}
