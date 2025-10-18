import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import type {
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
  SessionStatusInfo,
  SessionTodoItem,
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

  return true;
};

export const buildProviderLabels = (
  catalog: ProviderCatalog
): ReadonlyMap<ProviderStackId, string> => {
  const entries = Object.entries(catalog) as [
    ProviderStackId,
    ProviderStackDescriptor,
  ][];

  return new Map(entries.map(([id, descriptor]) => [id, descriptor.title]));
};

export const createInitialSnapshot = (
  session: SessionRecord,
  providerLabels: ReadonlyMap<ProviderStackId, string>
): SessionSnapshot => {
  const providersSummary = session.providerIds
    .map((providerId) => providerLabels.get(providerId) ?? providerId)
    .join(" + ");

  const now = Date.now();
  const baseMessage = {
    id: `message-${now}`,
    createdAt: now,
  } as const;

  const messages: SessionMessage[] = [
    {
      ...baseMessage,
      role: "system",
      content: `Session created with ${providersSummary}.`,
    },
    {
      id: `message-${now + 1}`,
      createdAt: now,
      role: "assistant",
      content:
        "This is a placeholder environment. Real provider responses will appear here once the orchestrator is connected.",
    },
  ];

  const todos: SessionTodoItem[] = [
    {
      id: `todo-${now}`,
      title: "Draft the first request for the selected providers",
      completed: false,
    },
    {
      id: `todo-${now + 1}`,
      title: "Review provider outputs and capture key findings",
      completed: false,
    },
  ];

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
    messages,
    todos,
    status,
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
