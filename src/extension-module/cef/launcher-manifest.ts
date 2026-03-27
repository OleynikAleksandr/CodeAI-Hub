import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtensionContext } from "vscode";
import type { PlatformKey } from "./platform";

export interface LauncherManifestEntry {
  readonly launcherVersion: string;
  readonly package: string;
  readonly sha1?: string;
  readonly size: number;
}

export interface LauncherManifest {
  readonly baseUrl: string;
  readonly platforms: Record<PlatformKey, LauncherManifestEntry | undefined>;
  readonly schema: number;
}

export const readLauncherManifest = async (
  context: ExtensionContext
): Promise<LauncherManifest> => {
  const manifestPath = context.asAbsolutePath(
    path.join("assets", "launcher", "manifest.json")
  );
  const raw = await fs.readFile(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as LauncherManifest;
  if (parsed.schema !== 1) {
    throw new Error("Unsupported launcher manifest schema");
  }
  return parsed;
};
