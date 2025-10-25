import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import type { SessionMessage } from "../../../../types/session";
import { providerIdSet } from "../session/helpers";
import type {
  CoreBridgeSession,
  CoreBridgeStatePayload,
  ServerProvider,
  ServerSession,
  ServerSessionMessage,
  ServerStatusResponse,
} from "./types";

const toNumberTimestamp = (value?: string): number => {
  if (!value) {
    return Date.now();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

const sanitizeProvider = (
  provider: ServerProvider | undefined
): ProviderStackDescriptor | null => {
  if (!provider || typeof provider.id !== "string") {
    return null;
  }

  const providerId = provider.id as ProviderStackId;
  if (!providerIdSet.has(providerId)) {
    return null;
  }

  return {
    id: providerId,
    title: provider.name ?? provider.id,
    description: provider.description ?? "",
    connected: provider.status !== "inactive",
  };
};

export const sanitizeMessage = (
  message: ServerSessionMessage | undefined
): SessionMessage | null => {
  if (
    !message ||
    typeof message.id !== "string" ||
    typeof message.content !== "string"
  ) {
    return null;
  }

  const role = message.role ?? "assistant";
  if (!(["assistant", "user", "system"] as const).includes(role as never)) {
    return null;
  }

  return {
    id: message.id,
    role,
    content: message.content,
    createdAt: toNumberTimestamp(message.timestamp),
  };
};

export const sanitizeSession = (
  session: ServerSession | undefined
): CoreBridgeSession | null => {
  if (
    !session ||
    typeof session.id !== "string" ||
    typeof session.title !== "string" ||
    typeof session.providerId !== "string"
  ) {
    return null;
  }

  const providerId = session.providerId as ProviderStackId;
  if (!providerIdSet.has(providerId)) {
    return null;
  }

  const sessionId = session.id;

  const record = {
    id: sessionId,
    title: session.title,
    providerIds: [providerId],
    createdAt: toNumberTimestamp(session.createdAt),
  };

  const messages =
    session.messages
      ?.map((message) => sanitizeMessage(message))
      .filter((message): message is SessionMessage => Boolean(message)) ?? [];

  return {
    record,
    messages,
  };
};

export const convertStatusResponse = (
  status: ServerStatusResponse,
  fallbackProviders: readonly ProviderStackDescriptor[]
): CoreBridgeStatePayload => {
  const providers = status.providers
    ?.map((provider) => sanitizeProvider(provider))
    .filter((provider): provider is ProviderStackDescriptor =>
      Boolean(provider)
    ) ?? [...fallbackProviders];

  const sessions =
    status.sessions
      ?.map((session) => sanitizeSession(session))
      .filter((session): session is CoreBridgeSession => Boolean(session)) ??
    [];

  return {
    sessions,
    providers,
  };
};
