import type { DiagramModulesManagedGitBoundary } from "./diagram-modules-managed-git-boundary";

const MANAGED_WORKFLOW_LEDGER_COMMIT_MESSAGE =
  "chore: advance managed workflow ledger";

export const commitManagedWorkflowLedger = async (params: {
  readonly gitBoundary: DiagramModulesManagedGitBoundary;
  readonly ledgerPaths: readonly string[];
  readonly workspaceRoot: string;
}): Promise<void> => {
  await params.gitBoundary.commitManagedChanges({
    commitMessage: MANAGED_WORKFLOW_LEDGER_COMMIT_MESSAGE,
    managedPaths: params.ledgerPaths,
    workspaceRoot: params.workspaceRoot,
  });
};
