import type { ProviderRegistry } from "../../core/providers/provider-registry";
import type { ProviderStackDescriptor } from "../../types/provider";

type StartStage = "chat" | "idea" | "spec" | "plan" | "execute";

type NotifyWebview = (message: Record<string, unknown>) => void;

export const cloneStack = (
  descriptor: ProviderStackDescriptor
): ProviderStackDescriptor => ({
  id: descriptor.id,
  title: descriptor.title,
  description: descriptor.description,
  connected: descriptor.connected,
});

const resolveStageFromCommand = (command: string): StartStage | null => {
  switch (command) {
    case "startChat":
      return "chat";
    case "startIdea":
      return "idea";
    case "startSpec":
      return "spec";
    case "startPlan":
      return "plan";
    case "startExecute":
      return "execute";
    default:
      return null;
  }
};

export const tryOpenProviderPickerForStartCommand = (
  command: string,
  providerRegistry: ProviderRegistry,
  notifyWebview: NotifyWebview
): boolean => {
  const stage = resolveStageFromCommand(command);
  if (!stage) {
    return false;
  }

  const stacks = providerRegistry
    .listStacks()
    .filter((stack) => stack.connected)
    .map((stack) => cloneStack(stack));

  const filtered =
    stage === "chat"
      ? stacks
      : stacks.filter(
          (stack) => stack.id === "codexCli" || stack.id === "claudeCodeCli"
        );

  notifyWebview({
    type: "providerPicker:open",
    payload: { providers: filtered, stage },
  });

  return true;
};
