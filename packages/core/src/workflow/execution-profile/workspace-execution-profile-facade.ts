import { WorkspaceExecutionProfileStore } from "./workspace-execution-profile-store";
import type {
  WorkspaceExecutionProfileSeed,
  WorkspaceExecutionProfileSnapshot,
} from "./workspace-execution-profile-types";

type ReadOrBootstrapOptions = {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly resolveLegacySeed:
    | (() => Promise<WorkspaceExecutionProfileSeed | null>)
    | (() => WorkspaceExecutionProfileSeed | null);
};

type EnsureLockedOptions = {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly seed: WorkspaceExecutionProfileSeed;
};

export class WorkspaceExecutionProfileFacade {
  private readonly store: WorkspaceExecutionProfileStore;

  constructor(options?: { readonly store?: WorkspaceExecutionProfileStore }) {
    this.store = options?.store ?? new WorkspaceExecutionProfileStore();
  }

  read(
    workspaceRoot: string,
    workspaceSlug: string
  ): Promise<WorkspaceExecutionProfileSnapshot | null> {
    return this.store.read(workspaceRoot, workspaceSlug);
  }

  async ensureLocked(
    options: EnsureLockedOptions
  ): Promise<WorkspaceExecutionProfileSnapshot> {
    const existing = await this.store.read(
      options.workspaceRoot,
      options.workspaceSlug
    );
    if (existing) {
      return existing;
    }
    return this.store.lock(
      options.workspaceRoot,
      options.workspaceSlug,
      options.seed
    );
  }

  async readOrBootstrap(
    options: ReadOrBootstrapOptions
  ): Promise<WorkspaceExecutionProfileSnapshot | null> {
    const existing = await this.store.read(
      options.workspaceRoot,
      options.workspaceSlug
    );
    if (existing) {
      return existing;
    }
    const seed = await options.resolveLegacySeed();
    if (!seed) {
      return null;
    }
    return this.store.lock(options.workspaceRoot, options.workspaceSlug, seed);
  }
}
