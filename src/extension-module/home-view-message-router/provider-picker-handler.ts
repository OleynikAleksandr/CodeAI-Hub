import { window } from "vscode";
import type { ProviderRegistry } from "../../core/providers/provider-registry";
import type {
  SessionLauncher,
  SessionLaunchRequest,
  SessionLaunchResult,
} from "../../core/session/session-launcher";
import type { ProviderStackId } from "../../types/provider";
import type { ProviderPickerMessage } from "./message-types";
import { isSuccessfulLaunch, serializeSession } from "./serialization";

type ProviderPickerContext = {
  readonly providerRegistry: ProviderRegistry;
  readonly sessionLauncher: SessionLauncher;
  readonly notifyWebview: (message: Record<string, unknown>) => void;
};

const sanitizeProviderIds = (
  providerRegistry: ProviderRegistry,
  identifiers: readonly unknown[]
): ProviderStackId[] => {
  const knownStacks = providerRegistry.listStacks().map((stack) => stack.id);
  const knownSet = new Set<ProviderStackId>(knownStacks);
  const sanitized: ProviderStackId[] = [];

  for (const identifier of identifiers) {
    if (typeof identifier !== "string") {
      continue;
    }

    const candidate = identifier as ProviderStackId;
    if (!knownSet.has(candidate)) {
      continue;
    }

    sanitized.push(candidate);
  }

  return sanitized;
};

const launchSession = (
  sessionLauncher: SessionLauncher,
  request: SessionLaunchRequest
): SessionLaunchResult => sessionLauncher.launch(request);

export const handleProviderPickerMessage = (
  message: ProviderPickerMessage,
  context: ProviderPickerContext
): void => {
  if (message.type === "providerPicker:cancel") {
    window.showInformationMessage("Session creation cancelled.");
    return;
  }

  const providerIds = sanitizeProviderIds(
    context.providerRegistry,
    message.payload?.providerIds ?? []
  );

  if (providerIds.length === 0) {
    window.showWarningMessage(
      "Select at least one provider to start a session."
    );
    return;
  }

  const result = launchSession(context.sessionLauncher, { providerIds });
  if (!isSuccessfulLaunch(result)) {
    window.showWarningMessage(result.summary);
    return;
  }

  context.notifyWebview({
    type: "session:created",
    payload: serializeSession(result.session),
  });

  window.showInformationMessage(result.summary);
};
