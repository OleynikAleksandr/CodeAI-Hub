import { workspace } from "vscode";

export const resolveWorkspacePath = (): string => {
  const folder = workspace.workspaceFolders?.[0];
  if (folder) {
    return folder.uri.fsPath;
  }
  return process.cwd();
};
