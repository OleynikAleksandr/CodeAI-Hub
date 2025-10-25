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
};

export type ServerSessionMessage = {
  readonly id?: string;
  readonly role?: SessionMessageRole;
  readonly content?: string;
  readonly sessionId?: string;
  readonly timestamp?: string;
};

export type ServerSession = {
  readonly id?: string;
  readonly providerId?: ProviderStackId | string;
  readonly title?: string;
  readonly createdAt?: string;
  readonly messages?: readonly ServerSessionMessage[];
};

export type ServerStatusResponse = {
  readonly sessions?: readonly ServerSession[];
  readonly providers?: readonly ServerProvider[];
};

export type CoreBridgeSession = {
  readonly record: SessionRecord;
  readonly messages: readonly SessionMessage[];
};

export type CoreBridgeStatePayload = {
  readonly sessions: readonly CoreBridgeSession[];
  readonly providers: readonly ProviderStackDescriptor[];
};

export type CoreBridgeSessionMessagePayload = {
  readonly sessionId: string;
  readonly message: SessionMessage;
};
