import {
  getDefaultProviderDescription,
  getDefaultProviderTitle,
  type ProviderStackDescriptor,
  type ProviderStackId,
} from "../../../../types/provider";
import type {
  SessionBindingInfo,
  SessionMessage,
  SessionModelBindingInfo,
  SessionRecord,
} from "../../../../types/session";
import { normalizeBinding, providerIdSet } from "../session/helpers";
import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
  ServerProvider,
  ServerSession,
  ServerSessionMessage,
  ServerStatusResponse,
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toNumberTimestamp = (value?: string): number => {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

const readOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

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
    title: provider.name ?? getDefaultProviderTitle(providerId),
    description:
      provider.description ?? getDefaultProviderDescription(providerId),
    connected: provider.status === "active",
    statusMessage:
      typeof provider.statusMessage === "string"
        ? provider.statusMessage
        : null,
  };
};

const sanitizeSessionModelBinding = (
  binding: ServerSession["modelBinding"] | undefined
): SessionModelBindingInfo | null => {
  if (!isRecord(binding)) {
    return null;
  }
  const providerId = binding.providerId;
  const modelId = readOptionalString(binding.modelId);
  if (!(typeof providerId === "string" && modelId)) {
    return null;
  }
  const normalizedProviderId = providerId as ProviderStackId;
  if (!providerIdSet.has(normalizedProviderId)) {
    return null;
  }

  const normalized: SessionModelBindingInfo = {
    providerId: normalizedProviderId,
    modelId,
  };
  const baseModelId = readOptionalString(binding.baseModelId);
  const reasoningEffort = readOptionalString(binding.reasoningEffort);
  const source = readOptionalString(binding.source);
  const thinkingLevel = readOptionalString(binding.thinkingLevel);
  const boundAt = readOptionalString(binding.boundAt);
  const updatedAt = readOptionalString(binding.updatedAt);

  return {
    ...normalized,
    ...(baseModelId ? { baseModelId } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
    ...(source ? { source } : {}),
    ...(typeof binding.thinkingEnabled === "boolean"
      ? { thinkingEnabled: binding.thinkingEnabled }
      : {}),
    ...(thinkingLevel ? { thinkingLevel } : {}),
    ...(boundAt ? { boundAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
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
  if (
    !(["assistant", "user", "system", "thinking"] as const).includes(
      role as never
    )
  ) {
    return null;
  }

  const normalizedContent =
    role === "assistant"
      ? (extractIdeaCollectorResponse(message.content) ?? message.content)
      : message.content;

  const visibilityAtEmission =
    message.visibilityAtEmission === "hidden" ||
    message.visibilityAtEmission === "visible"
      ? message.visibilityAtEmission
      : undefined;
  const translationState =
    message.translationState === "pending"
      ? message.translationState
      : undefined;

  return {
    id: message.id,
    role,
    content: normalizedContent,
    createdAt: toNumberTimestamp(message.timestamp),
    ...(typeof message.localizedContent === "string" &&
    message.localizedContent.trim().length > 0
      ? { localizedContent: message.localizedContent }
      : {}),
    ...(typeof message.tag === "string" ? { tag: message.tag } : {}),
    ...(translationState ? { translationState } : {}),
    ...(visibilityAtEmission ? { visibilityAtEmission } : {}),
  };
};

const generateLocalMessageId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const extractIdeaCollectorResponse = (content: string): string | null => {
  if (!content.trim().startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(content) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    let suggestedResponse: string | null = null;
    if (typeof parsed.suggested_response === "string") {
      suggestedResponse = parsed.suggested_response;
    } else if (typeof parsed.suggestedResponse === "string") {
      suggestedResponse = parsed.suggestedResponse;
    }
    if (!suggestedResponse?.trim()) {
      return null;
    }
    const hasSignature =
      typeof parsed.conversation_state === "object" ||
      typeof parsed.next_action === "string" ||
      typeof parsed.nextAction === "string";
    return hasSignature ? suggestedResponse : null;
  } catch {
    return null;
  }
};

export const sanitizeSession = (
  session: ServerSession | undefined
): SessionRecord | null => {
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

  const bindingCandidate: SessionBindingInfo = {
    providerSessionId:
      typeof session.providerSessionId === "string"
        ? session.providerSessionId
        : null,
    status:
      session.providerSessionStatus === "ready" ||
      session.providerSessionStatus === "failed"
        ? session.providerSessionStatus
        : "pending",
  };

  return {
    id: session.id,
    title: session.title,
    providerIds: [providerId],
    workspacePath: session.workspacePath ?? "",
    initiativeSlug:
      typeof session.initiativeSlug === "string"
        ? session.initiativeSlug
        : null,
    stage: typeof session.stage === "string" ? session.stage : null,
    runSlug:
      typeof session.runSlug === "string" && session.runSlug.trim().length > 0
        ? session.runSlug.trim()
        : null,
    sessionKind: session.sessionKind === "collector" ? "collector" : null,
    continuationParentId:
      typeof session.continuationParentId === "string"
        ? session.continuationParentId
        : null,
    continuationIndex:
      typeof session.continuationIndex === "number"
        ? session.continuationIndex
        : null,
    createdAt: toNumberTimestamp(session.createdAt),
    binding: normalizeBinding(bindingCandidate),
    modelBinding: sanitizeSessionModelBinding(session.modelBinding),
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
      .filter((session): session is SessionRecord => Boolean(session)) ?? [];

  return {
    sessions,
    providers,
  };
};

export const sanitizeSessionMessagePayload = (
  payload: unknown
): CoreBridgeSessionMessagePayload | null => {
  if (!isRecord(payload) || typeof payload.sessionId !== "string") {
    return null;
  }
  const messageSource = isRecord(payload.message)
    ? ({
        sessionId: payload.sessionId,
        ...(payload.message as Record<string, unknown>),
      } as ServerSessionMessage)
    : (payload as ServerSessionMessage);
  const normalized = sanitizeMessage(messageSource);
  if (!normalized) {
    return null;
  }
  return { sessionId: payload.sessionId, message: normalized };
};

export const sanitizeSessionBindingPayload = (
  payload: unknown
): CoreBridgeSessionBindingPayload | null => {
  if (!isRecord(payload) || typeof payload.sessionId !== "string") {
    return null;
  }
  const providerSessionId =
    payload.providerSessionId === null ||
    typeof payload.providerSessionId === "string"
      ? payload.providerSessionId
      : null;
  return {
    sessionId: payload.sessionId,
    providerSessionId,
    status:
      payload.status === "pending" ||
      payload.status === "ready" ||
      payload.status === "failed"
        ? payload.status
        : "pending",
  };
};

export const sanitizeSessionErrorPayload = (
  payload: unknown
): { readonly sessionId: string; readonly message: string } | null => {
  if (!isRecord(payload) || typeof payload.sessionId !== "string") {
    return null;
  }
  const providerLabel =
    typeof payload.providerId === "string" &&
    payload.providerId.trim().length > 0
      ? `[${payload.providerId.trim()}] `
      : "";
  const message =
    typeof payload.message === "string" && payload.message.trim().length > 0
      ? payload.message.trim()
      : "Unknown error.";
  return {
    sessionId: payload.sessionId,
    message: `${providerLabel}${message}`,
  };
};

export const createSystemSessionMessage = (
  content: string
): SessionMessage => ({
  id: generateLocalMessageId(),
  role: "system",
  content,
  createdAt: Date.now(),
});
