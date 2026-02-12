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
import type { Settings } from "../components/settings/settings-state-model";
import type { CoreBridgeSessionMessagePayload } from "../core-bridge/types";
import { buildModelInfoList } from "./model-info-builder";
import { readLastKnownTokenUsage } from "./token-usage-cache";
import { readLastKnownUsageLimits } from "./usage-limits-cache";

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

  const hasValidStatusMessage =
    candidate.statusMessage === undefined ||
    candidate.statusMessage === null ||
    typeof candidate.statusMessage === "string";

  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.connected === "boolean" &&
    hasValidStatusMessage
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
  providerLabels: ReadonlyMap<ProviderStackId, string>,
  settings?: Settings | null
): SessionSnapshot => {
  const providersSummary = session.providerIds
    .map(
      (providerId) =>
        providerLabels.get(providerId) ?? getDefaultProviderTitle(providerId)
    )
    .join(" + ");

  const now = Date.now();
  const models = buildModelInfoList(session.providerIds, settings ?? null);

  const cachedTokenUsage = session.binding.providerSessionId
    ? readLastKnownTokenUsage(session.binding.providerSessionId)
    : null;
  const cachedUsageLimits = readLastKnownUsageLimits(providersSummary);

  const status: SessionStatusInfo = {
    providerSummary: providersSummary,
    models,
    tokenUsage: {
      used: cachedTokenUsage?.used ?? 0,
      limit: cachedTokenUsage?.limit ?? 200_000,
    },
    ...(cachedUsageLimits ? { usageLimits: cachedUsageLimits } : {}),
    continuityLock: {
      active: false,
      updatedAt: now,
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

export const removeSnapshot = (
  snapshots: Record<string, SessionSnapshot>,
  sessionId: string
): Record<string, SessionSnapshot> => {
  const { [sessionId]: _discarded, ...rest } = snapshots;
  return rest;
};

export type SessionSnapshots = Record<string, SessionSnapshot>;

export const appendMessageToSnapshots = (
  snapshots: SessionSnapshots,
  payload: CoreBridgeSessionMessagePayload
): SessionSnapshots => {
  const snapshot = snapshots[payload.sessionId];
  if (!snapshot) {
    return snapshots;
  }
  return {
    ...snapshots,
    [payload.sessionId]: {
      ...snapshot,
      messages: [...snapshot.messages, payload.message],
    },
  } satisfies SessionSnapshots;
};

export const mergeHistoryIntoSnapshots = (
  snapshots: SessionSnapshots,
  payload: {
    readonly sessionId: string;
    readonly messages: readonly SessionMessage[];
  }
): SessionSnapshots => {
  const snapshot = snapshots[payload.sessionId];
  if (!snapshot) {
    return snapshots;
  }
  const merged = new Map<string, SessionMessage>();
  for (const message of snapshot.messages) {
    merged.set(message.id, message);
  }
  for (const message of payload.messages) {
    merged.set(message.id, message);
  }
  const ordered = Array.from(merged.values()).sort(
    (a, b) => a.createdAt - b.createdAt
  );
  return {
    ...snapshots,
    [payload.sessionId]: {
      ...snapshot,
      messages: ordered,
    },
  } satisfies SessionSnapshots;
};

export type ProviderTheme = "claude" | "codex" | "gemini";
export const mapProviderTheme = (
  providerId: ProviderStackId | null
): ProviderTheme | null => {
  switch (providerId) {
    case "claudeCodeCli":
      return "claude";
    case "codexCli":
      return "codex";
    case "geminiCli":
      return "gemini";
    default:
      return null;
  }
};

export const resolveProviderWaitColor = (
  providerTheme: ProviderTheme | null
): string => {
  switch (providerTheme) {
    case "claude":
      return "rgba(255, 145, 5, 0.70)";
    case "codex":
      return "rgba(1, 240, 216, 0.70)";
    case "gemini":
      return "rgba(171, 52, 203, 0.70)";
    default:
      return "rgba(127, 140, 141, 0.70)";
  }
};
