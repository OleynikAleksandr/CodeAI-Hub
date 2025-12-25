import { basename } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { ProjectRegistryStorage } from "./project-registry-storage";
import type { WorkspaceProject } from "./types";

export class ProjectRegistry {
  private readonly storage = new ProjectRegistryStorage();

  listWorkspaces(): WorkspaceProject[] {
    const data = this.storage.load();
    return data.workspaces;
  }

  addWorkspace(path: string, name?: string): WorkspaceProject {
    const data = this.storage.load();
    const existing = data.workspaces.find((w) => w.path === path);
    if (existing) {
      return existing;
    }

    const newProject: WorkspaceProject = {
      id: uuidv4(),
      name: name ?? basename(path),
      path,
      lastUsed: new Date().toISOString(),
    };

    data.workspaces.push(newProject);
    this.storage.save(data);
    return newProject;
  }

  removeWorkspace(id: string): void {
    const data = this.storage.load();
    const index = data.workspaces.findIndex((w) => w.id === id);
    if (index !== -1) {
      data.workspaces.splice(index, 1);
      this.storage.save(data);
    }
  }

  markLastUsed(id: string): void {
    const data = this.storage.load();
    const project = data.workspaces.find((w) => w.id === id);
    if (project) {
      (project as { lastUsed: string }).lastUsed = new Date().toISOString();
      (data as { lastActiveWorkspaceId: string }).lastActiveWorkspaceId = id;
      this.storage.save(data);
    }
  }

  getLastActiveWorkspace(): WorkspaceProject | undefined {
    const data = this.storage.load();
    if (!data.lastActiveWorkspaceId) {
      return;
    }
    return data.workspaces.find((w) => w.id === data.lastActiveWorkspaceId);
  }
}
