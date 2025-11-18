import type { ProviderStackId } from "../../../../types/provider";

type Sender = (payload: unknown) => void;

export type ProviderRuntimeActions = ReturnType<
  typeof createProviderRuntimeActions
>;

export const createProviderRuntimeActions = (send: Sender) => ({
  refresh: (providerId?: ProviderStackId) => {
    send({
      type: "provider:refresh-versions",
      payload: { providerId },
    });
  },
  installVendor: (providerId: ProviderStackId) => {
    send({
      type: "provider:install-vendor-runtime",
      payload: { providerId },
    });
  },
  restoreVetted: (providerId: ProviderStackId) => {
    send({
      type: "provider:restore-runtime",
      payload: { providerId },
    });
  },
});
