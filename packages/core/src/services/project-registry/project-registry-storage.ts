import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ProjectRegistrySchema } from "./types";

const STATE_DIR = ".codeai-hub/state";
const REGISTRY_FILE = "projects.json";

export class ProjectRegistryStorage {
  private readonly storagePath: string;

  constructor() {
    const home = homedir();
    this.storagePath = join(home, STATE_DIR, REGISTRY_FILE);
  }

  load(): ProjectRegistrySchema {
    if (!existsSync(this.storagePath)) {
      return { workspaces: [] };
    }
    try {
      const content = readFileSync(this.storagePath, "utf-8");
      return JSON.parse(content) as ProjectRegistrySchema;
    } catch {
      return { workspaces: [] };
    }
  }

  save(data: ProjectRegistrySchema): void {
    const dir = join(homedir(), STATE_DIR);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.storagePath, JSON.stringify(data, null, 2), "utf-8");
  }
}
