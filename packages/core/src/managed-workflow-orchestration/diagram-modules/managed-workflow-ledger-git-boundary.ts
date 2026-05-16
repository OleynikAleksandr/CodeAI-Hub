import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { DiagramModulesManagedGitBoundary } from "./diagram-modules-managed-git-boundary";

const MANAGED_WORKFLOW_LEDGER_COMMIT_MESSAGE =
  "chore: advance managed workflow ledger";

const pathExists = async (absolutePath: string): Promise<boolean> =>
  Boolean(await stat(absolutePath).catch(() => null));

const collectRuntimeMetadataPaths = async (
  workspaceRoot: string
): Promise<readonly string[]> => {
  const hubRoot = path.join(workspaceRoot, ".codeai-hub");
  const entries = await readdir(hubRoot, { withFileTypes: true }).catch(
    () => []
  );
  const paths: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    for (const relativePath of [
      `.codeai-hub/${entry.name}/continuity`,
      `.codeai-hub/${entry.name}/workflow/state.json`,
    ]) {
      if (await pathExists(path.join(workspaceRoot, relativePath))) {
        paths.push(relativePath);
      }
    }
  }
  return paths;
};

export const commitManagedWorkflowLedger = async (params: {
  readonly gitBoundary: DiagramModulesManagedGitBoundary;
  readonly ledgerPaths: readonly string[];
  readonly workspaceRoot: string;
}): Promise<void> => {
  const runtimeMetadataPaths = await collectRuntimeMetadataPaths(
    params.workspaceRoot
  );
  await params.gitBoundary.commitManagedChanges({
    commitMessage: MANAGED_WORKFLOW_LEDGER_COMMIT_MESSAGE,
    managedPaths: [...params.ledgerPaths, ...runtimeMetadataPaths],
    workspaceRoot: params.workspaceRoot,
  });
};
