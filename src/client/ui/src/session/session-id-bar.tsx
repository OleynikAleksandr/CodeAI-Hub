import { type CSSProperties, useEffect } from "react";
import type {
  SessionBindingInfo,
  SessionStatusInfo,
} from "../../../../types/session";
import { resolveStatusUsageLimitScopeKey } from "./helpers";
import { buildResetLabel } from "./session-id-bar-reset-format";

const SESSION_ID_PREFIX_LENGTH = 8;

export interface UsageLimitsRefreshRequest {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly sessionId: string;
}

interface SessionIdBarProps {
  readonly binding: SessionBindingInfo;
  readonly onRefreshUsageLimits?: (request: UsageLimitsRefreshRequest) => void;
  readonly sessionId: string;
  readonly status: SessionStatusInfo;
}

const resolveIdLabel = (binding: SessionBindingInfo): string => {
  if (binding.providerSessionId) {
    const shortId = binding.providerSessionId.slice(
      0,
      SESSION_ID_PREFIX_LENGTH
    );
    return `ID: ${shortId}-...`;
  }
  if (binding.status === "pending") {
    return "ID: pending...";
  }
  return "ID: unavailable";
};

type LimitBarStyle = CSSProperties;

const clampPercent = (value: number): number => {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
};

const renderLimitLabel = (payload: {
  readonly label: string;
  readonly percentUsed: number | null;
  readonly resetLabel: string | null;
}): string =>
  [
    payload.percentUsed === null
      ? payload.label
      : `${payload.label} ${payload.percentUsed}%`,
    payload.resetLabel ? `(${payload.resetLabel})` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

const readProviderLabelPrefix = (
  status: SessionStatusInfo,
  binding: SessionBindingInfo
): string | null => {
  const scopeKey = resolveStatusUsageLimitScopeKey(status, binding);
  const providerId = scopeKey?.split(":")[0]?.trim().toLowerCase();
  if (providerId) {
    return providerId;
  }

  switch (status.models?.[0]?.providerId) {
    case "claudeCodeCli":
      return "claude";
    case "codexCli":
      return "codex";
    case "geminiCli":
      return "gemini";
    default:
      return null;
  }
};

const buildFallbackLabels = (
  status: SessionStatusInfo,
  binding: SessionBindingInfo
): NonNullable<SessionStatusInfo["usageLimitLabels"]> => {
  switch (readProviderLabelPrefix(status, binding)) {
    case "gemini":
      return {
        currentSession: "Primary",
        currentWeekAllModels: "Secondary",
        currentWeekSonnetOnly: "Tertiary",
      };
    default:
      return {
        currentSession: "Session",
        currentWeekAllModels: "Weekly",
        currentWeekSonnetOnly: "Model Weekly",
      };
  }
};

interface LimitRowData {
  readonly fillStyle: LimitBarStyle | undefined;
  readonly label: string;
  readonly percentUsed: number | null;
  readonly resetLabel: string | null;
}

const buildLimitRowData = (
  bucket:
    | { readonly percentUsed?: number; readonly resetsAt?: string | null }
    | null
    | undefined,
  fallbackLabel: string
): LimitRowData => {
  const percentUsed = bucket?.percentUsed ?? null;
  const resetsAt = bucket?.resetsAt ?? null;
  const resetLabel = resetsAt ? buildResetLabel(resetsAt) : null;
  const fillStyle: LimitBarStyle | undefined =
    percentUsed === null
      ? undefined
      : ({
          "--limit-fill": `${clampPercent(percentUsed)}%`,
        } as unknown as CSSProperties);
  return { fillStyle, label: fallbackLabel, percentUsed, resetLabel };
};

const LimitRow = ({ row }: { readonly row: LimitRowData }) => (
  <div
    className="session-id-bar__limit-row"
    title={row.resetLabel ?? undefined}
  >
    <span className="session-id-bar__limit-label">
      {renderLimitLabel({
        label: row.label,
        percentUsed: row.percentUsed,
        resetLabel: row.resetLabel,
      })}
    </span>
    <span className="session-id-bar__limit-bar" style={row.fillStyle} />
  </div>
);

const resolveRawProviderId = (status: SessionStatusInfo): string | null => {
  const raw = status.models?.[0]?.providerId;
  if (typeof raw !== "string") {
    return null;
  }
  switch (raw) {
    case "claudeCodeCli":
      return "claudeCodeCli";
    case "codexCli":
      return "codexCli";
    case "geminiCli":
      return "geminiCli";
    default:
      return raw;
  }
};

const SessionIdBar = ({
  binding,
  onRefreshUsageLimits,
  sessionId,
  status,
}: SessionIdBarProps) => {
  const rawProviderId = resolveRawProviderId(status);
  useEffect(() => {
    if (rawProviderId && onRefreshUsageLimits) {
      onRefreshUsageLimits({
        sessionId,
        providerId: rawProviderId,
        providerSessionId: binding.providerSessionId,
      });
    }
  }, [
    binding.providerSessionId,
    onRefreshUsageLimits,
    rawProviderId,
    sessionId,
  ]);
  const resolvedUsageLimits = status.usageLimits ?? null;
  const resolvedUsageLimitLabels =
    status.usageLimitLabels ?? buildFallbackLabels(status, binding);

  const primary = buildLimitRowData(
    resolvedUsageLimits?.currentSession,
    resolvedUsageLimitLabels.currentSession ?? "Session"
  );
  const secondary = buildLimitRowData(
    resolvedUsageLimits?.currentWeekAllModels,
    resolvedUsageLimitLabels.currentWeekAllModels ?? "Weekly"
  );
  const tertiary = buildLimitRowData(
    resolvedUsageLimits?.currentWeekSonnetOnly,
    resolvedUsageLimitLabels.currentWeekSonnetOnly ?? "Model Weekly"
  );

  return (
    <section
      aria-label={`Session identifier ${resolveIdLabel(binding)}`}
      className="session-panel session-id-bar"
    >
      <span className="session-id-bar__id">{resolveIdLabel(binding)}</span>
      <div aria-hidden className="session-id-bar__limits">
        <LimitRow row={primary} />
        <LimitRow row={secondary} />
        {tertiary.percentUsed !== null && <LimitRow row={tertiary} />}
      </div>
    </section>
  );
};

export default SessionIdBar;
