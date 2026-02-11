import type { CSSProperties } from "react";
import type {
  SessionBindingInfo,
  SessionStatusInfo,
} from "../../../../types/session";

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

const TIMEZONE_SUFFIX_PATTERN = /^(.*)\s+\([^)]+\)\s*$/;

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
  readonly resetsAt: string | null;
}): string =>
  [
    payload.percentUsed === null
      ? payload.label
      : `${payload.label} ${payload.percentUsed}%`,
    payload.resetsAt ? `(Resets ${payload.resetsAt})` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

const stripTimeZoneSuffix = (value: string): string => {
  // Claude Code often includes a timezone suffix: "5pm (Europe/Madrid)".
  // Inline labels should be short; keep the full string in the tooltip.
  const trimmed = value.trim();
  const match = TIMEZONE_SUFFIX_PATTERN.exec(trimmed);
  return match?.[1]?.trim() ? match[1].trim() : trimmed;
};

const SessionIdBar = ({ binding, status }: SessionIdBarProps) => {
  const sessionPercent =
    status.usageLimits?.currentSession?.percentUsed ?? null;
  const sessionResetsAt = status.usageLimits?.currentSession?.resetsAt ?? null;
  const weeklyPercent =
    status.usageLimits?.currentWeekAllModels?.percentUsed ?? null;
  const weeklyResetsAt =
    status.usageLimits?.currentWeekAllModels?.resetsAt ?? null;

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
          title={sessionResetsAt ? `Resets ${sessionResetsAt}` : undefined}
        >
          <span className="session-id-bar__limit-label">
            {renderLimitLabel({
              label: "session",
              percentUsed: sessionPercent,
              resetsAt: sessionResetsAt
                ? stripTimeZoneSuffix(sessionResetsAt)
                : null,
            })}
          </span>
          <span
            className="session-id-bar__limit-bar"
            style={sessionFillStyle}
          />
        </div>
        <div
          className="session-id-bar__limit-row"
          title={weeklyResetsAt ? `Resets ${weeklyResetsAt}` : undefined}
        >
          <span className="session-id-bar__limit-label">
            {renderLimitLabel({
              label: "weekly",
              percentUsed: weeklyPercent,
              resetsAt: weeklyResetsAt
                ? stripTimeZoneSuffix(weeklyResetsAt)
                : null,
            })}
          </span>
          <span className="session-id-bar__limit-bar" style={weeklyFillStyle} />
        </div>
      </div>
    </section>
  );
};

export default SessionIdBar;
