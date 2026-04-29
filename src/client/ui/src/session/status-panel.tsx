import type { ProviderStackId } from "../../../../types/provider";
import type { ModelInfo, SessionStatusInfo } from "../../../../types/session";
import { useLocalization } from "../app-host/use-localization";

const MAX_PERCENTAGE = 100;
const MIN_TOKEN_LIMIT = 1;
const PERCENT_SCALE = 100;
const USER_MESSAGES_CATEGORY = "system_feedback";

type CoreConnectionStatus = "connecting" | "ready" | "error";

interface StatusPanelProps {
  readonly connectionDetail?: string;
  readonly connectionStatus: CoreConnectionStatus;
  readonly status: SessionStatusInfo | null;
  readonly tokenDebugSummary?: string;
}

const PROVIDER_BUTTON_CLASS: Record<ProviderStackId, string> = {
  claudeCodeCli: "session-status-button--claude",
  codexCli: "session-status-button--codex",
  geminiCli: "session-status-button--gemini",
};

const resolveProviderButtonClass = (providerId: ProviderStackId): string =>
  PROVIDER_BUTTON_CLASS[providerId] ?? "";

const computeRemainingPercentage = (
  used: number,
  limit: number | null
): number => {
  const safeLimit = Math.max(limit ?? MIN_TOKEN_LIMIT, MIN_TOKEN_LIMIT);
  const usedPercentage = Math.max(
    0,
    Math.min(MAX_PERCENTAGE, Math.round((used / safeLimit) * PERCENT_SCALE))
  );
  return Math.max(0, Math.min(MAX_PERCENTAGE, MAX_PERCENTAGE - usedPercentage));
};

const StatusPanel = ({
  status,
  connectionStatus,
  tokenDebugSummary,
}: StatusPanelProps) => {
  const { t } = useLocalization();

  if (!status || connectionStatus !== "ready") {
    return null;
  }

  const model: ModelInfo | undefined = status.models?.[0];
  if (!model) {
    return null;
  }

  const modelLabel = t(
    USER_MESSAGES_CATEGORY,
    "session.status.model_label",
    "Model"
  );
  const tokensLabel = t(
    USER_MESSAGES_CATEGORY,
    "session.status.tokens_label",
    "Tokens"
  );

  const tokenLimit =
    status.tokenUsage.limit > 0 ? status.tokenUsage.limit : null;
  const remainingPercentage = computeRemainingPercentage(
    status.tokenUsage.used,
    tokenLimit
  );
  const tokensValue = `${status.tokenUsage.used.toLocaleString()} (${remainingPercentage}%)`;

  const providerButtonClass = resolveProviderButtonClass(model.providerId);
  const reasoningText =
    typeof model.reasoning === "string" && model.reasoning.length > 0
      ? `(${model.reasoning})`
      : null;

  return (
    <section className="session-status session-panel">
      <div className="session-status-row">
        <span className="session-status-chip session-status-chip--label">
          {`${modelLabel}:`}
        </span>
        <button
          aria-label={`${modelLabel}: ${model.modelDisplayName}`}
          className={`session-status-button ${providerButtonClass}`}
          type="button"
        >
          {model.modelDisplayName}
        </button>
        {reasoningText ? (
          <button
            aria-label={`Reasoning ${reasoningText}`}
            className={`session-status-button ${providerButtonClass}`}
            type="button"
          >
            {reasoningText}
          </button>
        ) : null}
        <span className="session-status-chip session-status-chip--limits">
          <span className="session-status-chip__label">{`${tokensLabel}:`}</span>
          <span className="session-status-chip__value">{tokensValue}</span>
        </span>
      </div>
      {tokenDebugSummary ? (
        <div className="session-status__debug-strip">{tokenDebugSummary}</div>
      ) : null}
    </section>
  );
};

export default StatusPanel;
