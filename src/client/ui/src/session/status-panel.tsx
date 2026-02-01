import type { ModelInfo, SessionStatusInfo } from "../../../../types/session";

const MAX_PERCENTAGE = 100;
const MIN_TOKEN_LIMIT = 1;
const PERCENT_SCALE = 100;
const SUPERVISOR_LABEL = "Core Supervisor";

const formatModelSummary = (models: readonly ModelInfo[]): string =>
  models
    .map((model) => {
      const base = model.modelDisplayName;
      return model.reasoning ? `${base} (${model.reasoning})` : base;
    })
    .join(", ");

type CoreConnectionStatus = "connecting" | "ready" | "error";

type StatusPanelProps = {
  readonly status: SessionStatusInfo | null;
  readonly connectionStatus: CoreConnectionStatus;
  readonly connectionDetail?: string;
};

const StatusPanel = ({
  status,
  connectionStatus,
  connectionDetail,
}: StatusPanelProps) => {
  if (!status || connectionStatus !== "ready") {
    return (
      <section className="session-status session-panel">
        <div className="session-status__row">
          <span className="session-status__label">{SUPERVISOR_LABEL}</span>
          <span className="session-status__value">
            {describeConnectionStatus(connectionStatus)}
          </span>
        </div>
        {connectionDetail ? (
          <div className="session-status__row session-status__row--muted">
            <span className="session-status__value">{connectionDetail}</span>
          </div>
        ) : null}
      </section>
    );
  }

  const { providerSummary, models, tokenUsage } = status;

  const tokenLimit = tokenUsage.limit > 0 ? tokenUsage.limit : null;
  const remainingPercentage = Math.max(
    0,
    Math.min(
      MAX_PERCENTAGE,
      Math.round(
        (((tokenLimit ?? MIN_TOKEN_LIMIT) - tokenUsage.used) /
          Math.max(tokenLimit ?? MIN_TOKEN_LIMIT, MIN_TOKEN_LIMIT)) *
          PERCENT_SCALE
      )
    )
  );

  // Show model details if available, otherwise fall back to provider summary
  const modelsSummary =
    models && models.length > 0 ? formatModelSummary(models) : providerSummary;

  return (
    <section className="session-status session-panel">
      <div className="session-status__row">
        <span className="session-status__label">Models</span>
        <span className="session-status__value">{modelsSummary}</span>
      </div>
      <div className="session-status__row">
        <span className="session-status__label">Tokens</span>
        <span className="session-status__value">
          {tokenUsage.used.toLocaleString()} /{" "}
          {tokenLimit ? tokenLimit.toLocaleString() : "—"} (
          {remainingPercentage}%)
        </span>
      </div>
    </section>
  );
};

export default StatusPanel;

const describeConnectionStatus = (status: CoreConnectionStatus): string => {
  switch (status) {
    case "ready":
      return "Core online";
    case "error":
      return "Core unavailable";
    default:
      return "Starting core…";
  }
};
