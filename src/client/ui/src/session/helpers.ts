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

export {
  isProviderDescriptorCandidate,
  isSessionRecordCandidate,
  parseProviderList,
  providerIdSet,
} from "./session-candidates";

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
    // All workflow sessions (stage + sessionKind set) start with a Core-initiated
    // prompt, so input must be locked immediately to prevent user interference
    // before the first turn completes.
    // NOTE: If future implementation/planning stages require a different initial
    // state (e.g., user-initiated first message), add explicit exceptions here
    // by checking session.stage or session.runSlug.
    connectionState:
      session.stage != null && session.sessionKind != null ? "running" : "idle",
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
  providerTheme: ProviderTheme | null,
  alpha = 0.7
): string => {
  const clampedAlpha = Math.max(0, Math.min(1, alpha));

  const [r, g, b] = (() => {
    switch (providerTheme) {
      case "claude":
        return [255, 145, 5] as const;
      case "codex":
        return [1, 240, 216] as const;
      case "gemini":
        return [171, 52, 203] as const;
      default:
        return [127, 140, 141] as const;
    }
  })();

  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
};
