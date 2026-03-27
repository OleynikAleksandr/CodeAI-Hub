import { window } from "vscode";
import type { ProviderRegistry } from "../../core/providers/provider-registry";
import type { CoreProcessManager } from "../core/core-process-manager";
import type { FileOperationsFacade } from "../file-operations/file-operations-facade";
import type { WebviewCommand } from "./message-types";
import { serializeStack } from "./serialization";

interface CommandContext {
  readonly coreProcessManager?: CoreProcessManager;
  readonly fileOperations: FileOperationsFacade;
  readonly notifyWebview: (message: Record<string, unknown>) => void;
  readonly providerRegistry: ProviderRegistry;
}

const PROJECT_MANAGER_HINT =
  "Use Project Manager for sessions and chats during FLOW development.";
const SESSIONS_DISABLED = true;

const notifyProjectManagerHint = (context: CommandContext): void => {
  window.showInformationMessage(PROJECT_MANAGER_HINT);
  context.notifyWebview({ type: "ui:useProjectManager" });
};

const handleNewSession = (context: CommandContext): void => {
  if (SESSIONS_DISABLED) {
    notifyProjectManagerHint(context);
    return;
  }
  const stacks = context.providerRegistry
    .listStacks()
    .filter((stack) => stack.connected);

  if (stacks.length === 0) {
    window.showWarningMessage(
      "No connected provider stacks detected. Install a provider CLI to continue."
    );
    return;
  }

  context.notifyWebview({
    type: "providerPicker:open",
    payload: {
      providers: stacks.map((stack) => serializeStack(stack)),
    },
  });
};

const handleStartChat = (context: CommandContext): void => {
  if (SESSIONS_DISABLED) {
    notifyProjectManagerHint(context);
    return;
  }
  const stacks = context.providerRegistry
    .listStacks()
    .filter((stack) => stack.connected);
  if (stacks.length === 0) {
    window.showWarningMessage(
      "No connected provider stacks detected. Install a provider CLI to continue."
    );
    return;
  }

  context.notifyWebview({
    type: "providerPicker:open",
    payload: {
      providers: stacks.map((stack) => serializeStack(stack)),
      stage: "chat",
    },
  });
};

const handleFileDropCommand = async (
  context: CommandContext
): Promise<void> => {
  const paths = await context.fileOperations.handleFileDrop();
  if (paths && paths.length > 0) {
    const formatted = context.fileOperations.formatPathsForInsertion(paths);
    context.notifyWebview({ command: "insertPath", path: formatted });
    context.notifyWebview({ command: "clearAllClipboards" });
    return;
  }

  window.showWarningMessage(
    "Unable to detect the dropped file path. Please try again."
  );
};

export const handleCommand = async (
  command: WebviewCommand,
  context: CommandContext
): Promise<void> => {
  switch (command) {
    case "newSession":
      handleNewSession(context);
      return;
    case "startChat":
      handleStartChat(context);
      return;
    case "lastSession":
      notifyProjectManagerHint(context);
      return;
    case "oldSessions":
      notifyProjectManagerHint(context);
      return;
    case "grabFilePathFromDrop":
      await handleFileDropCommand(context);
      return;
    case "clearAllClipboards":
      context.fileOperations.clearFileDropCache();
      return;
    case "custom1":
    case "custom2":
    case "custom3":
    case "custom4":
      window.showInformationMessage(
        "Custom quick actions will be defined later."
      );
      return;
    default:
      return;
  }
};
