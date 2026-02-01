import { readdir } from "node:fs/promises";
import type { Logger } from "../telemetry/logger";

export const listUnifiedSessionWorkspaceSlugs = async (options: {
  readonly rootDirectory: string;
  readonly logger: Logger;
}): Promise<string[]> => {
  try {
    const entries = await readdir(options.rootDirectory, {
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name.length > 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return [];
    }
    options.logger.warn("Failed to list unified session workspace roots", {
      rootDirectory: options.rootDirectory,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};
