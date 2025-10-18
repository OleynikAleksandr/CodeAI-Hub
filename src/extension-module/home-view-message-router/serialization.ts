import type { SessionLaunchResult } from "../../core/session/session-launcher";
import type { ProviderStackDescriptor } from "../../types/provider";
import type { SessionRecord } from "../../types/session";

export const serializeStack = (
  stack: ProviderStackDescriptor
): ProviderStackDescriptor => ({
  id: stack.id,
  title: stack.title,
  description: stack.description,
  connected: stack.connected,
});

export const serializeSession = (session: SessionRecord): SessionRecord => ({
  id: session.id,
  title: session.title,
  providerIds: [...session.providerIds],
  createdAt: session.createdAt,
});

export const isSuccessfulLaunch = (
  result: SessionLaunchResult
): result is Extract<SessionLaunchResult, { status: "ok" }> =>
  result.status === "ok";
