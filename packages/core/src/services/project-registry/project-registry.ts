import { basename } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { ProjectRegistryStorage } from "./project-registry-storage";
import type { WorkspaceProject } from "./types";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const readNonEmptyString = (value: unknown): string | null =>
  isNonEmptyString(value) ? value.trim() : null;

const toWorkspaceSlug = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return slug.length > 0 ? slug : "workspace";
};

const ensureUniqueSlug = (baseSlug: string, used: Set<string>): string => {
  if (!used.has(baseSlug)) {
    used.add(baseSlug);
    return baseSlug;
  }

  for (let suffix = 2; suffix < Number.POSITIVE_INFINITY; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }

  return baseSlug;
};

export class ProjectRegistry {
  private readonly storage = new ProjectRegistryStorage();

  private loadWithSlugMigration(): {
    readonly workspaces: WorkspaceProject[];
    readonly lastActiveWorkspaceId?: string;
  } {
    type WorkspaceProjectWithOptionalSlug = Omit<WorkspaceProject, "slug"> & {
      readonly slug?: unknown;
    };

    interface ProjectRegistrySchemaWithOptionalSlug {
      lastActiveWorkspaceId?: string;
      workspaces: WorkspaceProjectWithOptionalSlug[];
    }

    const data =
      this.storage.load() as unknown as ProjectRegistrySchemaWithOptionalSlug;

    const used = new Set<string>();
    let didMutate = false;

    for (const workspace of data.workspaces) {
      const nameCandidate =
        readNonEmptyString(workspace.name) ??
        basename(readNonEmptyString(workspace.path) ?? "workspace");
      const baseSlug = toWorkspaceSlug(nameCandidate);
      const currentSlug = readNonEmptyString(workspace.slug);
      let normalized: string;
      if (currentSlug && !used.has(currentSlug)) {
        used.add(currentSlug);
        normalized = currentSlug;
      } else {
        normalized = ensureUniqueSlug(baseSlug, used);
      }

      if (!currentSlug || currentSlug !== normalized) {
        (workspace as { slug: string }).slug = normalized;
        didMutate = true;
      }
    }

    if (didMutate) {
      this.storage.save(
        data as unknown as {
          readonly workspaces: WorkspaceProject[];
          readonly lastActiveWorkspaceId?: string;
        }
      );
    }

    return data as unknown as {
      readonly workspaces: WorkspaceProject[];
      readonly lastActiveWorkspaceId?: string;
    };
  }

  listWorkspaces(): WorkspaceProject[] {
    const data = this.loadWithSlugMigration();
    return data.workspaces;
  }

  addWorkspace(path: string, name?: string): WorkspaceProject {
    const data = this.loadWithSlugMigration();
    const existing = data.workspaces.find((w) => w.path === path);
    if (existing) {
      return existing;
    }

    const usedSlugs = new Set<string>(data.workspaces.map((w) => w.slug));
    const resolvedName = name ?? basename(path);
    const newProject: WorkspaceProject = {
      id: uuidv4(),
      name: resolvedName,
      slug: ensureUniqueSlug(toWorkspaceSlug(resolvedName), usedSlugs),
      path,
      lastUsed: new Date().toISOString(),
    };

    data.workspaces.push(newProject);
    this.storage.save(data);
    return newProject;
  }

  removeWorkspace(id: string): void {
    const data = this.loadWithSlugMigration();
    const index = data.workspaces.findIndex((w) => w.id === id);
    if (index !== -1) {
      data.workspaces.splice(index, 1);
      this.storage.save(data);
    }
  }

  markLastUsed(id: string): void {
    const data = this.loadWithSlugMigration();
    const project = data.workspaces.find((w) => w.id === id);
    if (project) {
      (project as { lastUsed: string }).lastUsed = new Date().toISOString();
      (data as { lastActiveWorkspaceId: string }).lastActiveWorkspaceId = id;
      this.storage.save(data);
    }
  }

  getLastActiveWorkspace(): WorkspaceProject | undefined {
    const data = this.loadWithSlugMigration();
    if (!data.lastActiveWorkspaceId) {
      return;
    }
    return data.workspaces.find((w) => w.id === data.lastActiveWorkspaceId);
  }
}
