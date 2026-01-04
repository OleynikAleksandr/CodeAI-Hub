import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { ExtensionContext } from "vscode";
import type { ExtensionLogger } from "../logging/extension-logger";

const DESTINATION_RELATIVE_PATH = path.join(
  ".codeai-hub",
  "templates",
  "full-development-flow",
  "idea",
  "questionnaire-template.md"
);

const BUNDLED_RELATIVE_PATH = path.join(
  "assets",
  "templates",
  "full-development-flow",
  "idea",
  "questionnaire-template.md"
);

const isNonEmptyTextFile = async (filePath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
};

export const ensureIdeaQuestionnaireTemplateInstalled = async (
  context: ExtensionContext,
  logger: ExtensionLogger
): Promise<void> => {
  const destinationPath = path.join(homedir(), DESTINATION_RELATIVE_PATH);
  const bundledPath = path.join(
    context.extensionUri.fsPath,
    BUNDLED_RELATIVE_PATH
  );

  logger.log("templates:questionnaire:ensure:start", {
    destinationPath,
    bundledPath,
  });

  if (await isNonEmptyTextFile(destinationPath)) {
    logger.log("templates:questionnaire:ensure:skip", { destinationPath });
    return;
  }

  try {
    const bundledContent = await fs.readFile(bundledPath, "utf8");
    const trimmed = bundledContent.trim();
    if (!trimmed) {
      logger.warn("templates:questionnaire:ensure:bundled-empty", {
        bundledPath,
      });
      return;
    }

    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, `${trimmed}\n`, "utf8");
    logger.log("templates:questionnaire:ensure:installed", { destinationPath });
  } catch (error) {
    logger.warn("templates:questionnaire:ensure:error", {
      destinationPath,
      bundledPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
