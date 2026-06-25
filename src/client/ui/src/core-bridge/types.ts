import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import type {
  SessionMessage,
  SessionMessageEmissionVisibility,
  SessionMessageRole,
  SessionMessageTranslationState,
  SessionModelBindingInfo,
  SessionRecord,
} from "../../../../types/session";

export interface CoreBridgeConfig {
  readonly httpUrl: string;
  readonly wsUrl: string;
}

export interface ServerProvider {
  readonly description?: string;
  readonly id?: string;
  readonly name?: string;
  readonly status?: string;
  readonly statusMessage?: string | null;
}

export interface ServerSessionMessage {
  readonly content?: string;
  readonly id?: string;
  readonly localizedContent?: string;
  readonly role?: SessionMessageRole;
  readonly sessionId?: string;
  readonly tag?: string;
  readonly timestamp?: string;
  readonly translationState?: SessionMessageTranslationState;
  readonly visibilityAtEmission?: SessionMessageEmissionVisibility;
}

export interface ServerSession {
  readonly continuationIndex?: number | null;
  readonly continuationParentId?: string | null;
  readonly createdAt?: string;
  readonly id?: string;
  readonly initiativeSlug?: string | null;
  readonly modelBinding?: SessionModelBindingInfo | null;
  readonly providerId?: ProviderStackId | string;
  readonly providerSessionId?: string | null;
  readonly providerSessionStatus?: "pending" | "ready" | "failed";
  readonly runSlug?: string | null;
  readonly sessionKind?: "collector" | null;
  readonly stage?: string | null;
  readonly title?: string;
  readonly updatedAt?: string;
  readonly workspacePath?: string;
}

export interface ServerStatusResponse {
  readonly providers?: readonly ServerProvider[];
  readonly sessions?: readonly ServerSession[];
}

export interface CoreBridgeStatePayload {
  readonly providers: readonly ProviderStackDescriptor[];
  readonly sessions: readonly SessionRecord[];
}

export interface CoreBridgeSessionMessagePayload {
  readonly message: SessionMessage;
  readonly sessionId: string;
}

export interface CoreBridgeSessionMessageTranslationPayload {
  readonly localizedContent: string;
  readonly messageId: string;
  readonly sessionId: string;
  readonly sourceHash: string;
  readonly targetLanguage: string;
}

export interface CoreBridgeSessionBindingPayload {
  readonly providerSessionId: string | null;
  readonly sessionId: string;
  readonly status: "pending" | "ready" | "failed";
}

export interface CoreRuntimeStatusPayload {
  readonly detail?: string;
  readonly firstRun?: boolean;
  readonly label?: string;
  readonly phase?: string;
  readonly scope?: string;
  readonly timestamp?: string;
}
