import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtensionContext } from "vscode";
import type { PlatformKey } from "./platform";

export interface ManifestEntry {
  readonly cefVersion: string;
  readonly channel: string;
  readonly package: string;
  readonly sha1: string;
  readonly size: number;
}

export interface Manifest {
  readonly baseUrl: string;
  readonly platforms: Record<PlatformKey, ManifestEntry | undefined>;
  readonly schema: number;
}

export const readManifest = async (
  context: ExtensionContext
): Promise<Manifest> => {
  const manifestPath = context.asAbsolutePath(
    path.join("assets", "cef", "manifest.json")
  );
  const raw = await fs.readFile(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as Manifest;
  if (parsed.schema !== 1) {
    throw new Error("Unsupported CEF manifest schema");
  }
  return parsed;
};
