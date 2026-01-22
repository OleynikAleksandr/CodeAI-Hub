import {
  getDefaultProviderDescription,
  getDefaultProviderTitle,
  type ProviderStackDescriptor,
  type ProviderStackId,
} from "../../../../types/provider";
import type {
  SessionBindingInfo,
  SessionMessage,
  SessionRecord,
} from "../../../../types/session";
import { normalizeBinding, providerIdSet } from "../session/helpers";
import type {
  CoreBridgeStatePayload,
  ServerProvider,
  ServerSession,
  ServerSessionMessage,
  ServerStatusResponse,
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

  const isActive = provider.status === "active";

  return {
    id: providerId,
    title: provider.name ?? getDefaultProviderTitle(providerId),
    description:
      provider.description ?? getDefaultProviderDescription(providerId),
    connected: isActive,
    statusMessage:
      typeof provider.statusMessage === "string"
        ? provider.statusMessage
        : null,
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

  return {
    id: message.id,
    role,
    content: normalizedContent,
    createdAt: toNumberTimestamp(message.timestamp),
  };
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

  const sessionId = session.id;
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

  const sessionKind =
    session.sessionKind === "collector" || session.sessionKind === "reviewer"
      ? session.sessionKind
      : null;

  const runSlug =
    typeof session.runSlug === "string" && session.runSlug.trim().length > 0
      ? session.runSlug.trim()
      : null;

  return {
    id: sessionId,
    title: session.title,
    providerIds: [providerId],
    workspacePath: session.workspacePath ?? "",
    initiativeSlug:
      typeof session.initiativeSlug === "string"
        ? session.initiativeSlug
        : null,
    stage: typeof session.stage === "string" ? session.stage : null,
    runSlug,
    sessionKind,
    createdAt: toNumberTimestamp(session.createdAt),
    binding: normalizeBinding(bindingCandidate),
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

export const extractIdeaContractQuestionnaireTemplate = (
  contract: Record<string, unknown> | null
): string | null => {
  if (!contract) {
    return null;
  }
  const questionnaire = contract.questionnaire;
  if (!isRecord(questionnaire)) {
    return null;
  }
  const templateMarkdown = questionnaire.templateMarkdown;
  if (typeof templateMarkdown !== "string") {
    return null;
  }
  return templateMarkdown.trim().length > 0 ? templateMarkdown : null;
};
