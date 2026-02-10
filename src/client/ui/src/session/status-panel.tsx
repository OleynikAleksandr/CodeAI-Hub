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
  readonly tokenDebugSummary?: string;
};

const StatusPanel = ({
  status,
  connectionStatus,
  connectionDetail,
  tokenDebugSummary,
}: StatusPanelProps) => {
  if (!status || connectionStatus !== "ready") {
    return (
      <section className="session-status session-panel">
        <div className="session-status__row">
          <span className="session-input__hint session-status__label">
            {SUPERVISOR_LABEL}
          </span>
          <span className="session-input__hint session-status__value">
            {describeConnectionStatus(connectionStatus)}
          </span>
        </div>
        <div className="session-status__row session-status__row--reserved">
          {connectionDetail ? (
            <span className="session-input__hint session-status__value">
              {connectionDetail}
            </span>
          ) : null}
        </div>
      </section>
    );
  }

  const { providerSummary, models, tokenUsage } = status;

  const tokenLimit = tokenUsage.limit > 0 ? tokenUsage.limit : null;
  const usedPercentage = Math.max(
    0,
    Math.min(
      MAX_PERCENTAGE,
      Math.round(
        (tokenUsage.used /
          Math.max(tokenLimit ?? MIN_TOKEN_LIMIT, MIN_TOKEN_LIMIT)) *
          PERCENT_SCALE
      )
    )
  );
  const remainingPercentage = Math.max(
    0,
    Math.min(MAX_PERCENTAGE, MAX_PERCENTAGE - usedPercentage)
  );

  const modelsSummary =
    models && models.length > 0 ? formatModelSummary(models) : providerSummary;

  const tokensSummary = `${tokenUsage.used.toLocaleString()} / ${tokenLimit ? tokenLimit.toLocaleString() : "\u2014"} (${remainingPercentage}%)`;

  return (
    <section className="session-status session-status--single-line session-panel">
      <div className="session-status__row session-status__row--single-line">
        <span className="session-input__hint session-status__value session-status__value--primary">
          {`Models: ${modelsSummary}  |  Tokens: ${tokensSummary}`}
        </span>
        <span
          className={`session-input__hint session-status__value session-status__value--debug ${tokenDebugSummary ? "" : "session-status__value--debug-hidden"}`}
        >
          {tokenDebugSummary ?? "#1 \u2014"}
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
