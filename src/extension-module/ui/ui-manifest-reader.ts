import { readFile } from "node:fs/promises";
import type { UIManifest } from "./ui-types";

/**
 * Reads and validates the UI manifest from the specified path.
 * @param manifestPath Absolute path to the manifest.json file.
 * @returns Parsed UIManifest object.
 * @throws Error if the file cannot be read or validation fails.
 */
export async function readUIManifest(
  manifestPath: string
): Promise<UIManifest> {
  const content = await readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(content) as Partial<UIManifest>;

  if (manifest.schema !== 1) {
    throw new Error(
      `Unsupported UI manifest schema: ${manifest.schema}. Expected: 1`
    );
  }

  if (!manifest.bundles || typeof manifest.bundles !== "object") {
    throw new Error("Invalid UI manifest: missing 'bundles' object.");
  }

  return manifest as UIManifest;
}
