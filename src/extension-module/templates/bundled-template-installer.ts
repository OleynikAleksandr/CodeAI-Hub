import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtensionLogger } from "../logging/extension-logger";

interface BundledTemplateInstallOptions {
  readonly bundledPath: string;
  readonly destinationPath: string;
  readonly logger: ExtensionLogger;
  readonly logPrefix: string;
}

const readTextFile = async (filePath: string): Promise<string | null> => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

export const ensureBundledTemplateInstalled = async ({
  destinationPath,
  bundledPath,
  logger,
  logPrefix,
}: BundledTemplateInstallOptions): Promise<void> => {
  logger.log(`${logPrefix}:ensure:start`, {
    destinationPath,
    bundledPath,
  });

  try {
    const bundledContent = await readTextFile(bundledPath);
    const trimmedBundled = bundledContent?.trim() ?? "";
    if (!trimmedBundled) {
      logger.warn(`${logPrefix}:ensure:bundled-empty`, {
        bundledPath,
      });
      return;
    }

    const destinationContent = await readTextFile(destinationPath);
    const normalizedDestination = destinationContent?.trimEnd() ?? null;
    if (normalizedDestination === trimmedBundled) {
      logger.log(`${logPrefix}:ensure:up-to-date`, { destinationPath });
      return;
    }

    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, `${trimmedBundled}\n`, "utf8");
    logger.log(`${logPrefix}:ensure:installed`, {
      destinationPath,
      overwritten: destinationContent !== null,
    });
  } catch (error) {
    logger.warn(`${logPrefix}:ensure:error`, {
      destinationPath,
      bundledPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
