import type { ProviderStackId } from "../../types/provider";
import type { SessionRecord } from "../../types/session";

export type PendingStandaloneSession = {
  readonly createdAfter: number | null;
  readonly pending: boolean;
  readonly providerId: ProviderStackId | null;
  readonly providerSessionId: string | null;
};

type StandaloneChatSummary = {
  readonly createdAt?: string | null;
  readonly liveSessionId?: string | null;
  readonly providerId?: string;
  readonly providerSessionId?: string;
};

const readTimestampMs = (value: number | string | null | undefined): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isCreatedAfter = (
  value: number | string | null | undefined,
  createdAfter: number | null
): boolean => {
  if (createdAfter === null) {
    return true;
  }
  const timestamp = readTimestampMs(value);
  return timestamp !== null && timestamp >= createdAfter;
};

export const isPendingSessionMatch = (params: {
  readonly pending: PendingStandaloneSession;
  readonly session: SessionRecord;
  readonly workspacePath: string;
}): boolean =>
  params.pending.pending &&
  params.session.workspacePath === params.workspacePath &&
  (params.session.stage ?? null) === null &&
  (params.session.initiativeSlug ?? null) === null &&
  isCreatedAfter(params.session.createdAt, params.pending.createdAfter) &&
  (params.pending.providerId === null ||
    params.session.providerIds.includes(params.pending.providerId)) &&
  (params.pending.providerSessionId === null ||
    params.session.binding.providerSessionId === params.pending.providerSessionId);

export const findPendingStandaloneSessionId = (params: {
  readonly chats: readonly StandaloneChatSummary[];
  readonly pending: PendingStandaloneSession;
}): string | null => {
  const matched = params.chats.find(
    (chat) =>
      typeof chat.liveSessionId === "string" &&
      chat.liveSessionId.length > 0 &&
      isCreatedAfter(chat.createdAt, params.pending.createdAfter) &&
      (params.pending.providerId === null ||
        chat.providerId === params.pending.providerId) &&
      (params.pending.providerSessionId === null ||
        chat.providerSessionId === params.pending.providerSessionId)
  );
  return matched?.liveSessionId ?? null;
};

export const fetchPendingStandaloneSessionId = async (params: {
  readonly httpUrl: string;
  readonly pending: PendingStandaloneSession;
  readonly workspacePath: string;
}): Promise<string | null> => {
  const query = new URLSearchParams({ workspacePath: params.workspacePath });
  const response = await fetch(`${params.httpUrl}/api/v1/standalone-chats?${query}`);
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as {
    readonly chats?: readonly StandaloneChatSummary[];
  };
  return findPendingStandaloneSessionId({
    chats: Array.isArray(payload.chats) ? payload.chats : [],
    pending: params.pending,
  });
};
