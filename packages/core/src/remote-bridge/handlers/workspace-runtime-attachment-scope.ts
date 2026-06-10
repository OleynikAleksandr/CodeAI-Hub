import path from "node:path";

const resolveWorkspaceRuntimeAttachmentRoot = (
  mainWorkspaceRoot: string
): string => `${path.resolve(mainWorkspaceRoot)}.worktrees`;

export const isWorkspaceRuntimeRootObservable = (params: {
  readonly candidateWorkspaceRoot: string;
  readonly mainWorkspaceRoot: string;
}): boolean => {
  const mainWorkspaceRoot = path.resolve(params.mainWorkspaceRoot);
  const candidateWorkspaceRoot = path.resolve(params.candidateWorkspaceRoot);
  if (candidateWorkspaceRoot === mainWorkspaceRoot) {
    return true;
  }
  const attachmentRoot =
    resolveWorkspaceRuntimeAttachmentRoot(mainWorkspaceRoot);
  return (
    candidateWorkspaceRoot === attachmentRoot ||
    candidateWorkspaceRoot.startsWith(`${attachmentRoot}${path.sep}`)
  );
};
