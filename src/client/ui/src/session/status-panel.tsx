import { useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import type { ModelInfo, SessionStatusInfo } from "../../../../types/session";
import { useLocalization } from "../app-host/use-localization";
import { createDefaultSettings } from "../components/settings/settings-state-model";
import {
  SessionModelPickerCard,
  SessionReasoningPickerCard,
} from "./model-switcher/session-model-picker-card";
import { SessionModelSwitcherFacade } from "./model-switcher/session-model-switcher-facade";

const MAX_PERCENTAGE = 100;
const MIN_TOKEN_LIMIT = 1;
const PERCENT_SCALE = 100;
const USER_MESSAGES_CATEGORY = "system_feedback";

type CoreConnectionStatus = "connecting" | "ready" | "error";

interface StatusPanelProps {
  readonly connectionDetail?: string;
  readonly connectionStatus: CoreConnectionStatus;
  readonly onModelSelect?: (modelId: string) => void;
  readonly onReasoningSelect?: (reasoningId: string) => void;
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

const DEFAULT_SWITCHER_SETTINGS = createDefaultSettings();
const SWITCHER_FACADE = new SessionModelSwitcherFacade();

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
  onModelSelect,
  onReasoningSelect,
  tokenDebugSummary,
}: StatusPanelProps) => {
  const { t } = useLocalization();
  const [openPicker, setOpenPicker] = useState<"model" | "reasoning" | null>(
    null
  );

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
  const switcherState = SWITCHER_FACADE.buildState({
    modelInfo: model,
    providerId: model.providerId,
    settings: DEFAULT_SWITCHER_SETTINGS,
  });

  const handleModelSelect = (modelId: string) => {
    onModelSelect?.(modelId);
    setOpenPicker(null);
  };
  const handleReasoningSelect = (reasoningId: string) => {
    onReasoningSelect?.(reasoningId);
    setOpenPicker(null);
  };

  return (
    <section className="session-status session-panel">
      <div className="session-status-row">
        <span className="session-status-chip session-status-chip--label">
          {`${modelLabel}:`}
        </span>
        <span className="session-status-picker-anchor">
          <button
            aria-expanded={openPicker === "model"}
            aria-haspopup="dialog"
            aria-label={`${modelLabel}: ${model.modelDisplayName}`}
            className={`session-status-button ${providerButtonClass}`}
            onClick={() =>
              setOpenPicker((current) => (current === "model" ? null : "model"))
            }
            type="button"
          >
            {model.modelDisplayName}
          </button>
          {openPicker === "model" ? (
            <SessionModelPickerCard
              alignToFollowingChip
              onSelectModel={handleModelSelect}
              options={switcherState.modelOptions}
            />
          ) : null}
        </span>
        {reasoningText ? (
          <span className="session-status-picker-anchor">
            <button
              aria-expanded={openPicker === "reasoning"}
              aria-haspopup="dialog"
              aria-label={`Reasoning ${reasoningText}`}
              className={`session-status-button ${providerButtonClass}`}
              onClick={() =>
                setOpenPicker((current) =>
                  current === "reasoning" ? null : "reasoning"
                )
              }
              type="button"
            >
              {reasoningText}
            </button>
            {openPicker === "reasoning" ? (
              <SessionReasoningPickerCard
                onSelectReasoning={handleReasoningSelect}
                options={switcherState.reasoningOptions}
              />
            ) : null}
          </span>
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
