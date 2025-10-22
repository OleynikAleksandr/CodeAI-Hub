import type { SessionStatusInfo } from "../../../../types/session";

const MAX_PERCENTAGE = 100;
const MIN_TOKEN_LIMIT = 1;
const PERCENT_SCALE = 100;

type StatusPanelProps = {
  readonly status: SessionStatusInfo;
};

const StatusPanel = ({ status }: StatusPanelProps) => {
  const { providerSummary, tokenUsage } = status;

  const percentage = Math.min(
    MAX_PERCENTAGE,
    Math.round(
      (tokenUsage.used / Math.max(tokenUsage.limit, MIN_TOKEN_LIMIT)) *
        PERCENT_SCALE
    )
  );

  return (
    <section className="session-status session-panel">
      <div className="session-status__row">
        <span className="session-status__label">Providers</span>
        <span className="session-status__value">{providerSummary}</span>
      </div>
      <div className="session-status__row">
        <span className="session-status__label">Tokens</span>
        <span className="session-status__value">
          {tokenUsage.used.toLocaleString()} /{" "}
          {tokenUsage.limit.toLocaleString()} ({percentage}%)
        </span>
      </div>
    </section>
  );
};

export default StatusPanel;
