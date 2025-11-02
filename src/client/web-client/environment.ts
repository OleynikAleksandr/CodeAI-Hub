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
import type { CoreBridgeConfig } from "../ui/src/core-bridge/types";

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

const extractProviderIdentifiers = (payload: unknown): readonly unknown[] => {
  if (!isRecord(payload)) {
    return [];
  }

  const candidate = (payload as Record<string, unknown>).providerIds;
  return Array.isArray(candidate) ? (candidate as readonly unknown[]) : [];
};

const createStandaloneRouter = () => {
  const providerRegistry = new ProviderRegistry();
  const sessionLauncher = new SessionLauncher();

  const HTTP_NO_CONTENT = 204;

  const resolveCoreConfig = (): CoreBridgeConfig => {
    const globalScope = window as typeof window & {
      __CODEAI_CORE_CONFIG?: CoreBridgeConfig;
    };
    const fallback: CoreBridgeConfig = {
      httpUrl: "http://127.0.0.1:8080",
      wsUrl: "ws://127.0.0.1:8080/api/v1/stream",
    };
    const candidate = globalScope.__CODEAI_CORE_CONFIG;
    if (
      !candidate ||
      typeof candidate.httpUrl !== "string" ||
      typeof candidate.wsUrl !== "string"
    ) {
      return fallback;
    }
    return candidate;
  };

  const notifyWebview = (message: Record<string, unknown>) => {
    window.postMessage(message, "*");
  };

  const handleFileDropRequest = async (): Promise<void> => {
    const config = resolveCoreConfig();
    try {
      const response = await fetch(`${config.httpUrl}/api/v1/file-drop`, {
        method: "POST",
      });
      if (response.status === HTTP_NO_CONTENT) {
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as {
        readonly formatted?: unknown;
      };
      const formatted =
        typeof payload.formatted === "string" ? payload.formatted : null;
      if (formatted) {
        notifyWebview({ command: "insertPath", path: formatted });
      }
    } catch (_error) {
      // Intentionally ignored: the UI stays idle if file detection fails.
    }
  };

  const handleClearFileDropCache = async (): Promise<void> => {
    const config = resolveCoreConfig();
    try {
      await fetch(`${config.httpUrl}/api/v1/file-drop`, {
        method: "DELETE",
      });
    } catch (_error) {
      // Intentionally ignored: cache cleanup failure does not affect UX.
    }
  };

  const handleCommand = async (command: string): Promise<void> => {
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
      case "grabFilePathFromDrop": {
        await handleFileDropRequest();
        break;
      }
      case "clearAllClipboards": {
        await handleClearFileDropCache();
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
      extractProviderIdentifiers(message.payload)
    );

    if (providerIds.length === 0) {
      notifyWebview({
        type: "ui:providerPickerError",
        payload: {
          reason: "Select a provider to start a session.",
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
      (async () => {
        try {
          await handleCommand(message.command);
        } catch {
          /* no-op */
        }
      })();
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
