import type {
  DevelopmentTreeFilesystemObservedDirectory,
  DevelopmentTreeObservedDirectoryContentState,
} from "./development-tree-filesystem-applier";
import type {
  DevelopmentTreeFilesystemDirectoryPlan,
  DevelopmentTreeFilesystemPathPlan,
} from "./development-tree-filesystem-paths";

export type DevelopmentTreeOrphanDisposition =
  | "auto_delete_empty"
  | "requires_user_disposition";

export interface DevelopmentTreeOrphanDirectory {
  readonly contentState: DevelopmentTreeObservedDirectoryContentState;
  readonly disposition: DevelopmentTreeOrphanDisposition;
  readonly relativePath: string;
}

export interface DevelopmentTreeOrphanSummary {
  readonly orphanDirectories: readonly DevelopmentTreeOrphanDirectory[];
  readonly orphanRelativePaths: readonly string[];
  readonly populatedOrphanRelativePaths: readonly string[];
}

const TRAILING_SLASH_RE = /\/+$/u;

const normalizeRelativePath = (value: string): string =>
  value.replace(/\\/g, "/").replace(TRAILING_SLASH_RE, "");

const addDesiredPathWithParents = (
  desired: Set<string>,
  relativePath: string,
  rootRelativePath: string
): void => {
  let cursor = normalizeRelativePath(relativePath);
  while (cursor.startsWith(rootRelativePath) && cursor !== rootRelativePath) {
    desired.add(cursor);
    const parent = cursor.slice(0, cursor.lastIndexOf("/"));
    if (parent === cursor) {
      return;
    }
    cursor = parent;
  }
};

const toOrphanDirectory = (params: {
  readonly contentState?: DevelopmentTreeObservedDirectoryContentState;
  readonly relativePath: string;
}): DevelopmentTreeOrphanDirectory => {
  const contentState = params.contentState ?? "populated";
  return {
    relativePath: params.relativePath,
    contentState,
    disposition:
      contentState === "empty"
        ? "auto_delete_empty"
        : "requires_user_disposition",
  };
};

export class DevelopmentTreeOrphanRegistry {
  summarize(params: {
    readonly existingRelativePaths: readonly string[];
    readonly plan: DevelopmentTreeFilesystemPathPlan;
  }): DevelopmentTreeOrphanSummary {
    const desired = new Set<string>();
    for (const directory of params.plan.directories) {
      addDesiredPathWithParents(
        desired,
        directory.relativePath,
        params.plan.rootRelativePath
      );
    }
    const orphanRelativePaths = params.existingRelativePaths
      .map(normalizeRelativePath)
      .filter((relativePath) =>
        relativePath.startsWith(params.plan.rootRelativePath)
      )
      .filter((relativePath) => !relativePath.includes("/_orphaned/"))
      .filter((relativePath) => !desired.has(relativePath));
    const orphanDirectories = orphanRelativePaths.map((relativePath) =>
      toOrphanDirectory({ relativePath })
    );
    return {
      orphanDirectories,
      orphanRelativePaths,
      populatedOrphanRelativePaths: orphanDirectories
        .filter((directory) => directory.contentState === "populated")
        .map((directory) => directory.relativePath),
    };
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

  summarizeFromObservedDirectories(params: {
    readonly observedDirectories: readonly DevelopmentTreeFilesystemObservedDirectory[];
    readonly plan: DevelopmentTreeFilesystemPathPlan;
  }): DevelopmentTreeOrphanSummary {
    const observedByPath = new Map(
      params.observedDirectories.map((directory) => [
        normalizeRelativePath(directory.relativePath),
        directory.contentState,
      ])
    );
    const base = this.summarize({
      plan: params.plan,
      existingRelativePaths: params.observedDirectories.map(
        (directory) => directory.relativePath
      ),
    });
    const orphanDirectories = base.orphanRelativePaths.map((relativePath) =>
      toOrphanDirectory({
        relativePath,
        contentState: observedByPath.get(relativePath),
      })
    );
    return {
      orphanDirectories,
      orphanRelativePaths: base.orphanRelativePaths,
      populatedOrphanRelativePaths: orphanDirectories
        .filter((directory) => directory.contentState === "populated")
        .map((directory) => directory.relativePath),
    };
  }
}
