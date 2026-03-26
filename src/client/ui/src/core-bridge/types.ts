import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import type {
  SessionMessage,
  SessionMessageRole,
  SessionRecord,
} from "../../../../types/session";

export type CoreBridgeConfig = {
  readonly httpUrl: string;
  readonly wsUrl: string;
};

export type ServerProvider = {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly status?: string;
  readonly statusMessage?: string | null;
};

export type ServerSessionMessage = {
  readonly id?: string;
  readonly role?: SessionMessageRole;
  readonly content?: string;
  readonly sessionId?: string;
  readonly timestamp?: string;
  readonly tag?: string;
};

export type ServerSession = {
  readonly id?: string;
  readonly providerId?: ProviderStackId | string;
  readonly workspacePath?: string;
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly runSlug?: string | null;
  readonly sessionKind?: "collector" | null;
  readonly continuationParentId?: string | null;
  readonly continuationIndex?: number | null;
  readonly title?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly providerSessionId?: string | null;
  readonly providerSessionStatus?: "pending" | "ready" | "failed";
};

export type ServerStatusResponse = {
  readonly sessions?: readonly ServerSession[];
  readonly providers?: readonly ServerProvider[];
};

export type CoreBridgeStatePayload = {
  readonly sessions: readonly SessionRecord[];
  readonly providers: readonly ProviderStackDescriptor[];
};

export type CoreBridgeSessionMessagePayload = {
  readonly sessionId: string;
  readonly message: SessionMessage;
};

export type CoreBridgeSessionBindingPayload = {
  readonly sessionId: string;
  readonly providerSessionId: string | null;
  readonly status: "pending" | "ready" | "failed";
};

export type CoreRuntimeStatusPayload = {
  readonly phase?: string;
  readonly label?: string;
  readonly detail?: string;
  readonly scope?: string;
  readonly firstRun?: boolean;
  readonly timestamp?: string;
};
