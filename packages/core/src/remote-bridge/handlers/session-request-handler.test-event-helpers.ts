import type { BridgeEvent } from "../types";
import type { HandlerHarness } from "./session-request-handler.test-helpers";

export const collectTurnStateSequence = (
  events: readonly BridgeEvent[]
): string[] =>
  events
    .filter((event) => event.type === "session:stream")
    .map((event) => {
      const payload = event.payload as {
        readonly event?: {
          readonly data?: { readonly kind?: string; readonly state?: string };
        };
      };
      return payload.event?.data?.kind === "turn_state"
        ? (payload.event.data.state ?? null)
        : null;
    })
    .filter((state): state is string => typeof state === "string");

export const countIdleTurnStateEvents = (
  events: readonly BridgeEvent[]
): number =>
  events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: { readonly kind?: string; readonly state?: string };
      };
    };
    return (
      payload.event?.data?.kind === "turn_state" &&
      payload.event.data.state === "idle"
    );
  }).length;

export const countNoRolloverUnlockEvents = (
  events: readonly BridgeEvent[]
): number =>
  events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "unlocked" &&
      payload.event.data.reason === "no_rollover_needed"
    );
  }).length;

export const countContextCheckPendingLockEvents = (
  events: readonly BridgeEvent[]
): number =>
  events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "locked" &&
      payload.event.data.reason === "context_check_pending"
    );
  }).length;

export const countContinuityUnlocks = (
  harness: HandlerHarness,
  reason: string
): number =>
  harness.events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "unlocked" &&
      payload.event.data.reason === reason
    );
  }).length;
