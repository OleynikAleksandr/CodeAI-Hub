import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import { ProviderPicker } from "./provider-picker";

type ProviderPickerOpenMessage = {
  readonly type: "providerPicker:open";
  readonly payload?: {
    readonly providers?: unknown;
  };
};

type ProviderPickerConfirmMessage = {
  readonly type: "providerPicker:confirm";
  readonly payload: { readonly providerIds: readonly ProviderStackId[] };
};

type ProviderPickerCancelMessage = {
  readonly type: "providerPicker:cancel";
};

type OutgoingMessage =
  | ProviderPickerConfirmMessage
  | ProviderPickerCancelMessage;

type ProviderPickerState = {
  readonly visible: boolean;
  readonly providers: readonly ProviderStackDescriptor[];
};

type VsCodeApi = {
  postMessage: (message: unknown) => void;
};

const providerIdSet = new Set<ProviderStackId>([
  "claudeCodeCli",
  "codexCli",
  "geminiCli",
]);

const defaultState: ProviderPickerState = Object.freeze({
  visible: false,
  providers: [],
} satisfies ProviderPickerState);

const activateRoot = () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.classList.add("active");
  }
};

const getVsCodeApi = (): VsCodeApi | undefined => {
  const globalScope = window as typeof window & { vscode?: VsCodeApi };
  if (globalScope.vscode) {
    return globalScope.vscode;
  }

  if (typeof globalScope.acquireVsCodeApi === "function") {
    try {
      const api = globalScope.acquireVsCodeApi();
      globalScope.vscode = api;
      return api;
    } catch (_error) {
      return;
    }
  }

  return;
};

const vscodeApi = getVsCodeApi();

const postMessage = (message: OutgoingMessage) => {
  if (!vscodeApi) {
    return;
  }
  vscodeApi.postMessage(message);
};

const isProviderDescriptorCandidate = (
  value: unknown
): value is ProviderStackDescriptor => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.id !== "string") {
    return false;
  }

  const providerId = candidate.id as ProviderStackId;
  if (!providerIdSet.has(providerId)) {
    return false;
  }

  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.connected === "boolean"
  );
};

const parseProviderList = (
  candidates: unknown
): readonly ProviderStackDescriptor[] => {
  if (!Array.isArray(candidates)) {
    return [];
  }

  const validProviders: ProviderStackDescriptor[] = [];
  for (const candidate of candidates) {
    if (isProviderDescriptorCandidate(candidate)) {
      validProviders.push({
        id: candidate.id,
        title: candidate.title,
        description: candidate.description,
        connected: candidate.connected,
      });
    }
  }

  return validProviders;
};

const useProviderPickerState = (): [
  ProviderPickerState,
  (providers: readonly ProviderStackDescriptor[]) => void,
  () => void,
] => {
  const [state, setState] = useState<ProviderPickerState>(defaultState);

  const open = useCallback((providers: readonly ProviderStackDescriptor[]) => {
    setState({
      visible: true,
      providers,
    });
  }, []);

  const close = useCallback(() => {
    setState(defaultState);
  }, []);

  return [state, open, close];
};

const ProviderPickerHost = () => {
  const [state, open, close] = useProviderPickerState();

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      const message = event.data as ProviderPickerOpenMessage;
      if (!message || typeof message !== "object") {
        return;
      }

      if (message.type === "providerPicker:open") {
        const providers = parseProviderList(message.payload?.providers);
        if (providers.length === 0) {
          close();
          return;
        }
        activateRoot();
        open(providers);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, close]);

  const confirmSelection = (providerIds: readonly ProviderStackId[]) => {
    postMessage({
      type: "providerPicker:confirm",
      payload: { providerIds },
    });
    close();
  };

  const cancelSelection = () => {
    postMessage({
      type: "providerPicker:cancel",
    });
    close();
  };

  const memoizedProviders = useMemo(() => state.providers, [state.providers]);
  const pickerResetKey = useMemo(
    () =>
      `${state.visible ? "visible" : "hidden"}:${state.providers
        .map((provider) => provider.id)
        .join("|")}`,
    [state.visible, state.providers]
  );

  return (
    <ProviderPicker
      key={pickerResetKey}
      onCancel={cancelSelection}
      onConfirm={confirmSelection}
      providers={memoizedProviders}
      visible={state.visible}
    />
  );
};

const mount = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ProviderPickerHost />
    </StrictMode>
  );
};

mount();
