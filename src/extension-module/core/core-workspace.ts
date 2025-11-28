import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { workspace } from "vscode";

export const resolveWorkspacePath = (): string => {
  const folder = workspace.workspaceFolders?.[0];
  if (folder) {
    return folder.uri.fsPath;
  }
  return process.cwd();
};

export const resolveProviderModulePath = (
  providerId: string
): string | null => {
  const root = path.join(homedir(), ".codeai-hub", "providers", providerId);
  try {
    const latestPath = path.join(root, "latest");
    if (!existsSync(latestPath)) {
      return null;
    }
    const version = readFileSync(latestPath, "utf8").trim();
    if (!version) {
      return null;
    }
    const candidate = path.join(root, version);
    if (existsSync(candidate)) {
      return candidate;
    }
  } catch {
    return null;
  }
  return null;
};
