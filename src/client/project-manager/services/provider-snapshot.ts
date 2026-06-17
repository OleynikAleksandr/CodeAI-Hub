import {
  getDefaultProviderDescription,
  getDefaultProviderTitle,
  type ProviderStackDescriptor,
  type ProviderStackId,
} from "../../../types/provider";

type ProviderStatus = "active" | "inactive" | "degraded";

export type ProviderSnapshot = {
  readonly id: string;
  readonly status: ProviderStatus;
  readonly name?: string;
  readonly description?: string;
  readonly statusMessage?: string | null;
};

const DESCRIPTION_PROVIDER_IDS = new Set<ProviderStackId>([
  "claudeCodeCli",
  "codexCli",
  "geminiCli",
  "kimiCode",
  "glmNative",
  "glmOpenCode",
  "localModels",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isProviderStatus = (value: unknown): value is ProviderStatus =>
  value === "active" || value === "inactive" || value === "degraded";

const buildProviderSnapshot = (
  provider: Record<string, unknown>
): ProviderSnapshot | null => {
  const id = provider.id;
  const status = provider.status;
  if (typeof id !== "string" || !isProviderStatus(status)) {
    return null;
  }
  const statusMessage =
    typeof provider.statusMessage === "string" ? provider.statusMessage : null;
  const snapshot: ProviderSnapshot = {
    id,
    status,
    statusMessage,
    ...(typeof provider.name === "string" ? { name: provider.name } : {}),
    ...(typeof provider.description === "string"
      ? { description: provider.description }
      : {}),
  };
  return snapshot;
};

export const extractProviders = (payload: unknown): ProviderSnapshot[] => {
  if (!isRecord(payload)) {
    return [];
  }
  const providers = payload.providers;
  if (!Array.isArray(providers)) {
    return [];
  }
  return providers
    .map((provider) => {
      if (!isRecord(provider)) {
        return null;
      }
      return buildProviderSnapshot(provider);
    })
    .filter((provider): provider is ProviderSnapshot => provider !== null);
};

const toProviderDescriptor = (
  provider: ProviderSnapshot
): ProviderStackDescriptor | null => {
  const providerId = provider.id as ProviderStackId;
  if (!DESCRIPTION_PROVIDER_IDS.has(providerId)) {
    return null;
  }
  return {
    id: providerId,
    title: provider.name ?? getDefaultProviderTitle(providerId),
    description: provider.description ?? getDefaultProviderDescription(providerId),
    connected: provider.status === "active",
    statusMessage: provider.statusMessage ?? null,
  };
};

export const resolveDescriptionProviders = (
  snapshot: readonly ProviderSnapshot[]
): readonly ProviderStackDescriptor[] => {
  const mapped = snapshot
    .map((provider) => toProviderDescriptor(provider))
    .filter((provider): provider is ProviderStackDescriptor =>
      Boolean(provider)
    );
  if (mapped.length > 0) {
    const byId = new Map(mapped.map((provider) => [provider.id, provider]));
    return Array.from(DESCRIPTION_PROVIDER_IDS)
      .map((providerId) => byId.get(providerId))
      .filter((provider): provider is ProviderStackDescriptor =>
        Boolean(provider)
      );
  }
  return Array.from(DESCRIPTION_PROVIDER_IDS, (providerId) => ({
    id: providerId,
    title: getDefaultProviderTitle(providerId),
    description: getDefaultProviderDescription(providerId),
    connected: true,
    statusMessage: null,
  }));
};
