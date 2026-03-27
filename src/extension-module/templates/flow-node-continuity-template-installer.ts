import { homedir } from "node:os";
import path from "node:path";
import type { ExtensionContext } from "vscode";
import type { ExtensionLogger } from "../logging/extension-logger";
import { ensureBundledTemplateInstalled } from "./bundled-template-installer";

const DESTINATION_BASE_RELATIVE_PATH = path.join(
  ".codeai-hub",
  "templates",
  "flow",
  "continuity"
);

const BUNDLED_BASE_RELATIVE_PATH = path.join("assets", "flow", "continuity");

interface TemplateDescriptor {
  readonly logPrefix: string;
  readonly templateFileName: string;
}

const FLOW_NODE_CONTINUITY_TEMPLATES: readonly TemplateDescriptor[] = [
  {
    templateFileName: "resume.md",
    logPrefix: "templates:flow-continuity:resume",
  },
  {
    templateFileName: "create-report-doc.md",
    logPrefix: "templates:flow-continuity:create-report-doc",
  },
  {
    templateFileName: "create-report-code.md",
    logPrefix: "templates:flow-continuity:create-report-code",
  },
];

export const ensureFlowNodeContinuityTemplatesInstalled = async (
  context: ExtensionContext,
  logger: ExtensionLogger
): Promise<void> => {
  const extensionRoot = context.extensionUri.fsPath;
  const destinationRoot = path.join(homedir(), DESTINATION_BASE_RELATIVE_PATH);
  const bundledRoot = path.join(extensionRoot, BUNDLED_BASE_RELATIVE_PATH);

  for (const template of FLOW_NODE_CONTINUITY_TEMPLATES) {
    await ensureBundledTemplateInstalled({
      destinationPath: path.join(destinationRoot, template.templateFileName),
      bundledPath: path.join(bundledRoot, template.templateFileName),
      logger,
      logPrefix: template.logPrefix,
    });
  }
};
