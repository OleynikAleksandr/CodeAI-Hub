import { window } from "vscode";
import type { ProviderRegistry } from "../../core/providers/provider-registry";
import type { CoreProcessManager } from "../core/core-process-manager";
import type { FileOperationsFacade } from "../file-operations/file-operations-facade";
import type { WebviewCommand } from "./message-types";
import { serializeStack } from "./serialization";

type CommandContext = {
  readonly providerRegistry: ProviderRegistry;
  readonly notifyWebview: (message: Record<string, unknown>) => void;
  readonly fileOperations: FileOperationsFacade;
  readonly coreProcessManager?: CoreProcessManager;
};

type StartStage = "chat" | "idea" | "spec" | "plan" | "execute";

const handleNewSession = (context: CommandContext): void => {
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

const handleStartWithStage = (
  context: CommandContext,
  stage: StartStage
): void => {
  const stacks = context.providerRegistry
    .listStacks()
    .filter((stack) => stack.connected);

  const filtered =
    stage === "chat"
      ? stacks
      : stacks.filter(
          (stack) => stack.id === "codexCli" || stack.id === "claudeCodeCli"
        );

  if (filtered.length === 0) {
    const reason =
      stage === "chat"
        ? "No connected provider stacks detected. Install a provider CLI to continue."
        : "Flow steps require Codex or Claude (Structured Output). Connect Codex/Claude to continue.";
    window.showWarningMessage(reason);
    return;
  }

  context.notifyWebview({
    type: "providerPicker:open",
    payload: {
      providers: filtered.map((stack) => serializeStack(stack)),
      stage,
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
      handleStartWithStage(context, "chat");
      return;
    case "startIdea":
      handleStartWithStage(context, "idea");
      return;
    case "startSpec":
      handleStartWithStage(context, "spec");
      return;
    case "startPlan":
      handleStartWithStage(context, "plan");
      return;
    case "startExecute":
      handleStartWithStage(context, "execute");
      return;
    case "lastSession":
      context.notifyWebview({ type: "session:focusLast" });
      window.showInformationMessage(
        "Selecting the most recent session (placeholder)."
      );
      return;
    case "oldSessions":
      window.showInformationMessage(
        "Session history view is under construction."
      );
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
