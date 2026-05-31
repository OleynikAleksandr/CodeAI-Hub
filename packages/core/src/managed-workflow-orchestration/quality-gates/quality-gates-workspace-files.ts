import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readRequiredFile = async (
  absolutePath: string
): Promise<string | null> => {
  const fileStat = await stat(absolutePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }
  return readFile(absolutePath, "utf8").catch(() => null);
};

export const readPackageScripts = async (
  workspaceRoot: string
): Promise<Record<string, string> | null> => {
  const raw = await readRequiredFile(path.join(workspaceRoot, "package.json"));
  if (!raw) {
    return null;
  }
  try {
    const packageJson = JSON.parse(raw) as unknown;
    if (
      isRecord(packageJson) &&
      isRecord(packageJson.scripts) &&
      Object.values(packageJson.scripts).every(
        (entry) => typeof entry === "string"
      )
    ) {
      return packageJson.scripts as Record<string, string>;
    }
  } catch {
    return null;
  }
  return null;
};

export const readHookText = async (
  workspaceRoot: string,
  hookName: "pre-commit" | "pre-push"
): Promise<string> =>
  (await readRequiredFile(path.join(workspaceRoot, ".husky", hookName))) ?? "";
