import { ProviderRegistry } from "../../core/providers/provider-registry";
import {
  SessionLauncher,
  type SessionLaunchRequest,
  type SessionLaunchResult,
} from "../../core/session/session-launcher";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../types/provider";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const cloneStack = (
  descriptor: ProviderStackDescriptor
): ProviderStackDescriptor => ({
  id: descriptor.id,
  title: descriptor.title,
  description: descriptor.description,
  connected: descriptor.connected,
});

const isSuccessfulLaunch = (
  result: SessionLaunchResult
): result is Extract<SessionLaunchResult, { status: "ok" }> =>
  result.status === "ok";

const sanitizeProviderIds = (
  registry: ProviderRegistry,
  identifiers: readonly unknown[]
): ProviderStackId[] => {
  const knownStacks = registry.listStacks().map((stack) => stack.id);
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

const createStandaloneRouter = () => {
  const providerRegistry = new ProviderRegistry();
  const sessionLauncher = new SessionLauncher();

  const notifyWebview = (message: Record<string, unknown>) => {
    window.postMessage(message, "*");
  };

  const handleCommand = (command: string) => {
    switch (command) {
      case "newSession": {
        const stacks = providerRegistry
          .listStacks()
          .filter((stack) => stack.connected)
          .map((stack) => cloneStack(stack));

        notifyWebview({
          type: "providerPicker:open",
          payload: { providers: stacks },
        });
        break;
      }
      case "lastSession": {
        notifyWebview({ type: "session:focusLast" });
        break;
      }
      case "oldSessions": {
        // Placeholder: history view not implemented.
        break;
      }
      default:
        break;
    }
  };

  const handleProviderPickerMessage = (message: Record<string, unknown>) => {
    if (message.type === "providerPicker:cancel") {
      notifyWebview({ type: "ui:providerPickerCancelled" });
      return;
    }

    if (message.type !== "providerPicker:confirm") {
      return;
    }

    const providerIds = sanitizeProviderIds(
      providerRegistry,
      Array.isArray(message.payload?.providerIds)
        ? (message.payload.providerIds as readonly unknown[])
        : []
    );

    if (providerIds.length === 0) {
      notifyWebview({
        type: "ui:providerPickerError",
        payload: {
          reason: "Select at least one provider to start a session.",
        },
      });
      return;
    }

    const launchRequest: SessionLaunchRequest = { providerIds };
    const result = sessionLauncher.launch(launchRequest);

    if (!isSuccessfulLaunch(result)) {
      notifyWebview({
        type: "ui:providerPickerError",
        payload: { reason: result.summary },
      });
      return;
    }

    notifyWebview({
      type: "session:created",
      payload: {
        id: result.session.id,
        title: result.session.title,
        providerIds: [...result.session.providerIds],
        createdAt: result.session.createdAt,
      },
    });
  };

  return (message: unknown) => {
    if (!isRecord(message)) {
      return;
    }

    if (typeof message.command === "string") {
      handleCommand(message.command);
      return;
    }

    if (typeof message.type === "string") {
      handleProviderPickerMessage(message);
    }
  };
};

export const initializeStandaloneEnvironment = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const globalScope = window as typeof window & {
    acquireVsCodeApi?: () => {
      postMessage: (message: unknown) => void;
      setState: (state: unknown) => void;
      getState: () => unknown;
    };
    vscode?: {
      postMessage: (message: unknown) => void;
      setState?: (state: unknown) => void;
      getState?: () => unknown;
    };
  };

  if (typeof globalScope.acquireVsCodeApi === "function") {
    // Already running inside VS Code webview – nothing to override.
    return;
  }

  const routeMessage = createStandaloneRouter();

  const vsCodeApi = {
    postMessage: (message: unknown) => {
      routeMessage(message);
    },
    setState: () => {
      /* no-op */
    },
    getState: () => null,
  };

  globalScope.acquireVsCodeApi = () => vsCodeApi;
  globalScope.vscode = vsCodeApi;
};
