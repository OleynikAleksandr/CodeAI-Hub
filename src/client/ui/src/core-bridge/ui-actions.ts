import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import type { ProviderRuntimeActions } from "./provider-runtime-actions";
import type { CoreBridgeConfig } from "./types";

type ActionDeps = {
  readonly notifyWindow: (message: Record<string, unknown>) => void;
  readonly resolveConfig: () => CoreBridgeConfig;
  readonly getCachedProviders: () => readonly ProviderStackDescriptor[];
  readonly fetchStatusSnapshot: (config: CoreBridgeConfig) => Promise<void>;
  readonly enqueueMessage: (payload: unknown) => void;
  readonly runtimeActions: ProviderRuntimeActions;
};

export type CoreBridgeUiActions = {
  readonly sendChatMessage: (sessionId: string, content: string) => void;
  readonly deleteSession: (sessionId: string) => void;
  readonly refreshProviderVersions: (providerId?: ProviderStackId) => void;
  readonly installProviderVendorRuntime: (providerId: ProviderStackId) => void;
  readonly restoreProviderRuntime: (providerId: ProviderStackId) => void;
  readonly requestStatusSnapshot: () => void;
  readonly handleOutgoingVsCodeMessage: (message: unknown) => boolean;
};

const ensureProvidersAvailable = async (
  deps: ActionDeps
): Promise<readonly ProviderStackDescriptor[]> => {
  const cached = deps.getCachedProviders();
  if (cached.length > 0) {
    return cached;
  }
  const config = deps.resolveConfig();
  await deps.fetchStatusSnapshot(config);
  return deps.getCachedProviders();
};

const openProviderPicker = async (deps: ActionDeps): Promise<void> => {
  const providers = await ensureProvidersAvailable(deps);

  if (providers.length === 0) {
    deps.notifyWindow({
      type: "ui:providerPickerError",
      payload: { reason: "Core orchestrator is unavailable. Retry shortly." },
    });
    return;
  }

  deps.notifyWindow({
    type: "providerPicker:open",
    payload: { providers },
  });
};

const createSession = (
  deps: ActionDeps,
  providerIds: readonly ProviderStackId[]
): void => {
  const providerId = providerIds[0];
  if (!providerId) {
    deps.notifyWindow({
      type: "ui:providerPickerError",
      payload: { reason: "Select at least one provider to continue." },
    });
    return;
  }

  deps.enqueueMessage({
    type: "session:create",
    payload: { providerId },
  });
};

export const createCoreBridgeUiActions = (
  deps: ActionDeps
): CoreBridgeUiActions => ({
  sendChatMessage: (sessionId, content) => {
    if (!content.trim()) {
      return;
    }
    deps.enqueueMessage({
      type: "session:message",
      payload: {
        sessionId,
        content,
      },
    });
  },
  deleteSession: (sessionId) => {
    deps.enqueueMessage({
      type: "session:delete",
      payload: {
        sessionId,
      },
    });
  },
  refreshProviderVersions: (providerId) => {
    deps.runtimeActions.refresh(providerId);
  },
  installProviderVendorRuntime: (providerId) => {
    deps.runtimeActions.installVendor(providerId);
  },
  restoreProviderRuntime: (providerId) => {
    deps.runtimeActions.restoreVetted(providerId);
  },
  requestStatusSnapshot: () => {
    const config = deps.resolveConfig();
    deps.fetchStatusSnapshot(config).catch(() => {
      /* noop */
    });
  },
  handleOutgoingVsCodeMessage: (message) => {
    if (!message || typeof message !== "object") {
      return false;
    }
    const candidate = message as Record<string, unknown>;

    if (typeof candidate.command === "string") {
      if (candidate.command === "newSession") {
        openProviderPicker(deps).catch((error) => {
          deps.notifyWindow({
            type: "session:error",
            payload: { message: String(error) },
          });
        });
        return true;
      }
      return false;
    }

    if (candidate.type === "providerPicker:confirm") {
      const payload = candidate.payload as
        | { readonly providerIds?: readonly ProviderStackId[] }
        | undefined;
      const providerIds = payload?.providerIds ?? [];
      createSession(deps, providerIds);
      return true;
    }

    return false;
  },
});
