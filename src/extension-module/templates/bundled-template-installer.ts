import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtensionLogger } from "../logging/extension-logger";

type BundledTemplateInstallOptions = {
  readonly destinationPath: string;
  readonly bundledPath: string;
  readonly logger: ExtensionLogger;
  readonly logPrefix: string;
};

const isNonEmptyTextFile = async (filePath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
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

  if (await isNonEmptyTextFile(destinationPath)) {
    logger.log(`${logPrefix}:ensure:skip`, { destinationPath });
    return;
  }

  try {
    const bundledContent = await fs.readFile(bundledPath, "utf8");
    const trimmed = bundledContent.trim();
    if (!trimmed) {
      logger.warn(`${logPrefix}:ensure:bundled-empty`, {
        bundledPath,
      });
      return;
    }

    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, `${trimmed}\n`, "utf8");
    logger.log(`${logPrefix}:ensure:installed`, { destinationPath });
  } catch (error) {
    logger.warn(`${logPrefix}:ensure:error`, {
      destinationPath,
      bundledPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
