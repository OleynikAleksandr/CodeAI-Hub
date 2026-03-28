import type {
  CodexUsageLimitBucket,
  CodexUsageLimits,
  CodexUsageLimitsStreamPayload,
} from "../types";
import { isRecord } from "./codex-message-processor-shared";

const areUsageLimitBucketsEqual = (
  left: CodexUsageLimitBucket | null | undefined,
  right: CodexUsageLimitBucket | null | undefined
): boolean =>
  left?.percentUsed === right?.percentUsed &&
  left?.resetsAt === right?.resetsAt;

export const areUsageLimitsEqual = (
  left: CodexUsageLimits,
  right: CodexUsageLimits
): boolean =>
  areUsageLimitBucketsEqual(
    left?.currentSession ?? null,
    right?.currentSession ?? null
  ) &&
  areUsageLimitBucketsEqual(
    left?.currentWeekAllModels ?? null,
    right?.currentWeekAllModels ?? null
  ) &&
  areUsageLimitBucketsEqual(
    left?.currentWeekSonnetOnly ?? null,
    right?.currentWeekSonnetOnly ?? null
  );

export const areUsageLimitsPayloadEqual = (
  left: CodexUsageLimitsStreamPayload | null,
  right: CodexUsageLimitsStreamPayload | null
): boolean =>
  !(left || right) ||
  Boolean(
    left &&
      right &&
      left.providerScopeKey === right.providerScopeKey &&
      left.data.source === right.data.source &&
      left.data.collectedAt === right.data.collectedAt &&
      areUsageLimitsEqual(left.usageLimits, right.usageLimits)
  );

export const readUsageLimitsDiagnostics = (
  payload: CodexUsageLimitsStreamPayload | null
): Record<string, unknown> | null => {
  const diagnostics = isRecord(payload?.data)
    ? (payload.data as Record<string, unknown>).diagnostics
    : null;
  return isRecord(diagnostics) ? diagnostics : null;
};

export const buildRuntimeUsageLimitsPayload = (
  event: unknown
): string | null => {
  const root = isRecord(event) ? event : null;
  if (!root) {
    return null;
  }

  const payload = isRecord(root.payload) ? root.payload : null;
  if (payload?.type !== "token_count") {
    return null;
  }

  const rateLimits = payload.rate_limits ?? payload.rateLimits;
  if (!isRecord(rateLimits)) {
    return null;
  }

  return JSON.stringify({
    collectedAt:
      typeof root.timestamp === "string"
        ? root.timestamp
        : new Date().toISOString(),
    rateLimits,
  });
};
