import { homedir } from "node:os";
import path from "node:path";
import type { ExtensionContext } from "vscode";
import type { ExtensionLogger } from "../logging/extension-logger";
import { ensureBundledTemplateInstalled } from "./bundled-template-installer";

const DESTINATION_RELATIVE_PATH = path.join(
  ".codeai-hub",
  "templates",
  "full-development-flow",
  "idea",
  "idea-collector-prompt.md"
);

const BUNDLED_RELATIVE_PATH = path.join(
  "assets",
  "templates",
  "full-development-flow",
  "idea",
  "idea-collector-prompt.md"
);

export const ensureIdeaCollectorPromptInstalled = async (
  context: ExtensionContext,
  logger: ExtensionLogger
): Promise<void> => {
  const destinationPath = path.join(homedir(), DESTINATION_RELATIVE_PATH);
  const bundledPath = path.join(
    context.extensionUri.fsPath,
    BUNDLED_RELATIVE_PATH
  );

  await ensureBundledTemplateInstalled({
    destinationPath,
    bundledPath,
    logger,
    logPrefix: "templates:idea-prompt",
  });
};
