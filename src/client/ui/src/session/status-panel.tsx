import type { ModelInfo, SessionStatusInfo } from "../../../../types/session";
import { useLocalization } from "../app-host/use-localization";

const MAX_PERCENTAGE = 100;
const MIN_TOKEN_LIMIT = 1;
const PERCENT_SCALE = 100;
const STATUS_SEPARATOR = "\u00A0\u00A0|\u00A0\u00A0";
const USER_MESSAGES_CATEGORY = "system_feedback";

const formatModelSummary = (models: readonly ModelInfo[]): string =>
  models
    .map((model) => {
      const base = model.modelDisplayName;
      return model.reasoning ? `${base} (${model.reasoning})` : base;
    })
    .join(", ");

type CoreConnectionStatus = "connecting" | "ready" | "error";

interface StatusPanelProps {
  readonly connectionDetail?: string;
  readonly connectionStatus: CoreConnectionStatus;
  readonly status: SessionStatusInfo | null;
  readonly tokenDebugSummary?: string;
}

const StatusPanel = ({
  status,
  connectionStatus,
  connectionDetail,
  tokenDebugSummary,
}: StatusPanelProps) => {
  const { t } = useLocalization();
  const supervisorLabel = t(
    USER_MESSAGES_CATEGORY,
    "session.status.supervisor_label",
    "Core Supervisor"
  );
  const modelsLabel = t(
    USER_MESSAGES_CATEGORY,
    "session.status.models_label",
    "Models"
  );
  const tokensLabel = t(
    USER_MESSAGES_CATEGORY,
    "session.status.tokens_label",
    "Tokens"
  );

  if (!status || connectionStatus !== "ready") {
    return (
      <section className="session-status session-panel">
        <div className="session-status__row">
          <span className="session-input__hint session-status__label">
            {supervisorLabel}
          </span>
          <span className="session-input__hint session-status__value">
            {describeConnectionStatus(connectionStatus, t)}
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

  const tokensSummary = `${tokenUsage.used.toLocaleString()} (${remainingPercentage}%)`;

  return (
    <section className="session-status session-status--single-line session-panel">
      <div className="session-status__row session-status__row--single-line">
        <span className="session-input__hint session-status__value session-status__value--primary">
          {`${modelsLabel}: ${modelsSummary}${STATUS_SEPARATOR}${tokensLabel}: ${tokensSummary}`}
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

type TranslationResolver = ReturnType<typeof useLocalization>["t"];

const describeConnectionStatus = (
  status: CoreConnectionStatus,
  t: TranslationResolver
): string => {
  switch (status) {
    case "ready":
      return t(
        USER_MESSAGES_CATEGORY,
        "session.status.ready_connection_label",
        "Core online"
      );
    case "error":
      return t(
        USER_MESSAGES_CATEGORY,
        "session.status.unavailable_connection_label",
        "Core unavailable"
      );
    default:
      return t(
        USER_MESSAGES_CATEGORY,
        "session.status.starting_connection_label",
        "Starting core…"
      );
  }
};
