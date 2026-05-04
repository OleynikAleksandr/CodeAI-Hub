import type {
  DevelopmentTreeFilesystemDirectoryPlan,
  DevelopmentTreeFilesystemPathPlan,
} from "./development-tree-filesystem-paths";

export interface DevelopmentTreeOrphanSummary {
  readonly orphanRelativePaths: readonly string[];
}

const TRAILING_SLASH_RE = /\/+$/u;

const normalizeRelativePath = (value: string): string =>
  value.replace(/\\/g, "/").replace(TRAILING_SLASH_RE, "");

export class DevelopmentTreeOrphanRegistry {
  summarize(params: {
    readonly existingRelativePaths: readonly string[];
    readonly plan: DevelopmentTreeFilesystemPathPlan;
  }): DevelopmentTreeOrphanSummary {
    const desired = new Set(
      params.plan.directories.map((directory) =>
        normalizeRelativePath(directory.relativePath)
      )
    );
    const orphanRelativePaths = params.existingRelativePaths
      .map(normalizeRelativePath)
      .filter((relativePath) =>
        relativePath.startsWith(params.plan.rootRelativePath)
      )
      .filter((relativePath) => !relativePath.includes("/_orphaned/"))
      .filter((relativePath) => !desired.has(relativePath));
    return { orphanRelativePaths };
  }

  summarizeFromDirectories(params: {
    readonly existingDirectories: readonly DevelopmentTreeFilesystemDirectoryPlan[];
    readonly plan: DevelopmentTreeFilesystemPathPlan;
  }): DevelopmentTreeOrphanSummary {
    return this.summarize({
      plan: params.plan,
      existingRelativePaths: params.existingDirectories.map(
        (directory) => directory.relativePath
      ),
    });
  }
}
