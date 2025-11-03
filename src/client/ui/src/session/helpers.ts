import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type {
  SessionBindingInfo,
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
  SessionStatusInfo,
} from "../../../../types/session";

export type ProviderCatalog = Partial<
  Record<ProviderStackId, ProviderStackDescriptor>
>;

export const mergeCatalog = (
  catalog: ProviderCatalog,
  providers: readonly ProviderStackDescriptor[]
): ProviderCatalog => {
  const nextCatalog: ProviderCatalog = { ...catalog };
  for (const provider of providers) {
    nextCatalog[provider.id] = provider;
  }
  return nextCatalog;
};

export const providerIdSet = new Set<ProviderStackId>([
  "claudeCodeCli",
  "codexCli",
  "geminiCli",
]);

export const createDefaultBinding = (): SessionBindingInfo => ({
  providerSessionId: null,
  status: "pending",
});

export const normalizeBinding = (
  binding: SessionBindingInfo | undefined
): SessionBindingInfo => {
  if (!binding) {
    return createDefaultBinding();
  }
  return {
    providerSessionId: binding.providerSessionId ?? null,
    status:
      binding.status === "ready" || binding.status === "failed"
        ? binding.status
        : "pending",
  };
};

export const isProviderDescriptorCandidate = (
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

export const parseProviderList = (
  candidates: unknown
): readonly ProviderStackDescriptor[] => {
  if (!Array.isArray(candidates)) {
    return [];
  }

  const result: ProviderStackDescriptor[] = [];
  for (const candidate of candidates) {
    if (isProviderDescriptorCandidate(candidate)) {
      result.push(candidate);
    }
  }

  return result;
};

export const isSessionRecordCandidate = (
  value: unknown
): value is SessionRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.createdAt !== "number" ||
    !Array.isArray(candidate.providerIds)
  ) {
    return false;
  }

  for (const providerId of candidate.providerIds) {
    if (!providerIdSet.has(providerId as ProviderStackId)) {
      return false;
    }
  }
  if (
    !candidate.binding ||
    typeof candidate.binding !== "object" ||
    !("status" in candidate.binding)
  ) {
    return false;
  }

  const binding = candidate.binding as {
    readonly providerSessionId?: unknown;
    readonly status?: unknown;
  };
  if (
    binding.providerSessionId !== null &&
    typeof binding.providerSessionId !== "string"
  ) {
    return false;
  }
  return (
    binding.status === "pending" ||
    binding.status === "ready" ||
    binding.status === "failed"
  );
};

export const buildProviderLabels = (
  catalog: ProviderCatalog
): ReadonlyMap<ProviderStackId, string> => {
  const entries = Object.entries(catalog) as [
    ProviderStackId,
    ProviderStackDescriptor,
  ][];

  return new Map(
    entries.map(([id, descriptor]) => [
      id,
      descriptor.title ?? getDefaultProviderTitle(id),
    ])
  );
};

export const createInitialSnapshot = (
  session: SessionRecord,
  providerLabels: ReadonlyMap<ProviderStackId, string>
): SessionSnapshot => {
  const providersSummary = session.providerIds
    .map(
      (providerId) =>
        providerLabels.get(providerId) ?? getDefaultProviderTitle(providerId)
    )
    .join(" + ");

  const now = Date.now();

  const status: SessionStatusInfo = {
    providerSummary: providersSummary,
    tokenUsage: {
      used: 0,
      limit: 200_000,
    },
    connectionState: "idle",
    updatedAt: now,
  };

  return {
    messages: [],
    todos: [],
    status,
    binding: normalizeBinding(session.binding),
    draft: "",
  };
};

export const buildSnapshotFromMessages = (
  session: SessionRecord,
  providerLabels: ReadonlyMap<ProviderStackId, string>,
  messages: readonly SessionMessage[]
): SessionSnapshot => {
  const base = createInitialSnapshot(session, providerLabels);
  const updatedAt = messages.at(-1)?.createdAt ?? base.status.updatedAt;
  const tokenUsage = messages.reduce(
    (total, message) => total + message.content.length,
    0
  );

  return {
    ...base,
    messages: [...messages],
    status: {
      ...base.status,
      updatedAt,
      tokenUsage: {
        ...base.status.tokenUsage,
        used: Math.min(base.status.tokenUsage.limit, tokenUsage),
      },
    },
  };
};

export const removeSnapshot = (
  snapshots: Record<string, SessionSnapshot>,
  sessionId: string
): Record<string, SessionSnapshot> => {
  const { [sessionId]: _discarded, ...rest } = snapshots;
  return rest;
};
