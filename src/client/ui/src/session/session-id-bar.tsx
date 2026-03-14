import type { CSSProperties } from "react";
import type {
  SessionBindingInfo,
  SessionStatusInfo,
} from "../../../../types/session";
import { resolveStatusUsageLimitScopeKey } from "./helpers";
import { buildResetLabel } from "./session-id-bar-reset-format";
import { readLastKnownUsageLimits } from "./usage-limits-cache";

const SESSION_ID_PREFIX_LENGTH = 8;

type SessionIdBarProps = {
  readonly binding: SessionBindingInfo;
  readonly status: SessionStatusInfo;
};

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

const SessionIdBar = ({ binding, status }: SessionIdBarProps) => {
  const providerScopeKey = resolveStatusUsageLimitScopeKey(status, binding);
  const resolvedUsageLimits =
    status.usageLimits ??
    readLastKnownUsageLimits(providerScopeKey, status.providerSummary);
  const sessionPercent =
    resolvedUsageLimits?.currentSession?.percentUsed ?? null;
  const sessionResetsAt = resolvedUsageLimits?.currentSession?.resetsAt ?? null;
  const weeklyPercent =
    resolvedUsageLimits?.currentWeekAllModels?.percentUsed ?? null;
  const weeklyResetsAt =
    resolvedUsageLimits?.currentWeekAllModels?.resetsAt ?? null;
  const sessionResetLabel = sessionResetsAt
    ? buildResetLabel(sessionResetsAt)
    : null;
  const weeklyResetLabel = weeklyResetsAt
    ? buildResetLabel(weeklyResetsAt)
    : null;

  const sessionFillStyle: LimitBarStyle | undefined =
    sessionPercent === null
      ? undefined
      : ({
          "--limit-fill": `${clampPercent(sessionPercent)}%`,
        } as unknown as CSSProperties);
  const weeklyFillStyle: LimitBarStyle | undefined =
    weeklyPercent === null
      ? undefined
      : ({
          "--limit-fill": `${clampPercent(weeklyPercent)}%`,
        } as unknown as CSSProperties);

  return (
    <section
      aria-label={`Session identifier ${resolveIdLabel(binding)}`}
      className="session-panel session-id-bar"
    >
      <span className="session-id-bar__id">{resolveIdLabel(binding)}</span>
      <div aria-hidden className="session-id-bar__limits">
        <div
          className="session-id-bar__limit-row"
          title={sessionResetLabel ?? undefined}
        >
          <span className="session-id-bar__limit-label">
            {renderLimitLabel({
              label: "session",
              percentUsed: sessionPercent,
              resetLabel: sessionResetLabel,
            })}
          </span>
          <span
            className="session-id-bar__limit-bar"
            style={sessionFillStyle}
          />
        </div>
        <div
          className="session-id-bar__limit-row"
          title={weeklyResetLabel ?? undefined}
        >
          <span className="session-id-bar__limit-label">
            {renderLimitLabel({
              label: "weekly",
              percentUsed: weeklyPercent,
              resetLabel: weeklyResetLabel,
            })}
          </span>
          <span className="session-id-bar__limit-bar" style={weeklyFillStyle} />
        </div>
      </div>
    </section>
  );
};

export default SessionIdBar;
