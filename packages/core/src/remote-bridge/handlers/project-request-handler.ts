import type { ProjectRegistry } from "../../services/project-registry/project-registry";
import type { WorkspaceProject } from "../../services/project-registry/types";

export interface ProjectUpdateEvent {
  readonly payload: { readonly projects: readonly WorkspaceProject[] };
  readonly type: "projects:update";
}

export class ProjectRequestHandler {
  private readonly registry: ProjectRegistry;
  private readonly broadcaster: (event: ProjectUpdateEvent) => void;

  constructor(
    registry: ProjectRegistry,
    broadcaster: (event: ProjectUpdateEvent) => void
  ) {
    this.registry = registry;
    this.broadcaster = broadcaster;
  }

  handleList(): void {
    this.broadcastList();
  }

  handleAdd(path: string, name?: string): void {
    this.registry.addWorkspace(path, name);
    this.broadcastList();
  }

  handleRemove(id: string): void {
    this.registry.removeWorkspace(id);
    this.broadcastList();
  }

  private broadcastList(): void {
    const projects = this.registry.listWorkspaces();
    this.broadcaster({
      type: "projects:update",
      payload: { projects },
    });
  }
}
