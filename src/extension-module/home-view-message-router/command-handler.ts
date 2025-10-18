import { window } from "vscode";
import type { ProviderRegistry } from "../../core/providers/provider-registry";
import type { WebviewCommand } from "./message-types";
import { serializeStack } from "./serialization";

type CommandContext = {
  readonly providerRegistry: ProviderRegistry;
  readonly notifyWebview: (message: Record<string, unknown>) => void;
};

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

export const handleCommand = (
  command: WebviewCommand,
  context: CommandContext
): void => {
  switch (command) {
    case "newSession":
      handleNewSession(context);
      break;
    case "lastSession":
      context.notifyWebview({ type: "session:focusLast" });
      window.showInformationMessage(
        "Selecting the most recent session (placeholder)."
      );
      break;
    case "clearSession":
      context.notifyWebview({ type: "session:clearAll" });
      window.showInformationMessage("All sessions cleared (placeholder).");
      break;
    case "oldSessions":
      window.showInformationMessage(
        "Session history view is under construction."
      );
      break;
    case "custom1":
    case "custom2":
    case "custom3":
    case "custom4":
      window.showInformationMessage(
        "Custom quick actions will be defined later."
      );
      break;
    default:
      break;
  }
};
