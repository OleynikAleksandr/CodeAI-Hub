import { useRef, useState } from "react";
import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../types/claude-model-registry";
import type { CodexReasoningLevel } from "../../../../types/codex-model-registry";
import type { ProviderStackId } from "../../../../types/provider";
import type { ModelInfo, SessionStatusInfo } from "../../../../types/session";
import { useLocalization } from "../app-host/use-localization";
import {
  type StatusPanelLocalModelOption,
  StatusPanelModelPicker,
  type StatusPanelPickerMode,
} from "./status-panel-model-picker";

const MAX_PERCENTAGE = 100;
const MIN_TOKEN_LIMIT = 1;
const PERCENT_SCALE = 100;
const USER_MESSAGES_CATEGORY = "system_feedback";

type CoreConnectionStatus = "connecting" | "ready" | "error";
type ClaudeThinkingSelection = ClaudeThinkingEffort | "off";

interface StatusPanelProps {
  readonly connectionDetail?: string;
  readonly connectionStatus: CoreConnectionStatus;
  readonly localModelOptions?: readonly StatusPanelLocalModelOption[];
  readonly onSelectClaudeModel?: (modelId: ClaudeModelAliasId) => void;
  readonly onSelectClaudeThinking?: (thinking: ClaudeThinkingSelection) => void;
  readonly onSelectModel?: (modelId: string) => void;
  readonly onSelectReasoning?: (reasoning: CodexReasoningLevel) => void;
  readonly status: SessionStatusInfo | null;
  readonly tokenDebugSummary?: string;
}

const PROVIDER_BUTTON_CLASS: Record<ProviderStackId, string> = {
  claudeCodeCli: "session-status-button--claude",
  codexCli: "session-status-button--codex",
  geminiCli: "session-status-button--gemini",
  glmNative: "session-status-button--gemini",
  kimiCode: "session-status-button--kimi",
  glmOpenCode: "session-status-button--gemini",
  localModels: "session-status-button--gemini",
};

const resolveProviderButtonClass = (providerId: ProviderStackId): string =>
  PROVIDER_BUTTON_CLASS[providerId] ?? "";

const isCodexReasoningLevel = (value: string): value is CodexReasoningLevel =>
  value === "low" ||
  value === "medium" ||
  value === "high" ||
  value === "xhigh";

const isClaudeModelAliasId = (value: string): value is ClaudeModelAliasId =>
  value === "sonnet" || value === "opus" || value === "haiku";

const isClaudeThinkingSelection = (
  value: string
): value is ClaudeThinkingSelection =>
  value === "off" ||
  value === "low" ||
  value === "medium" ||
  value === "high" ||
  value === "xhigh" ||
  value === "max";

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

export const formatContextWindowUsage = (tokenUsage: {
  readonly limit: number;
  readonly used: number;
}): { readonly title: string; readonly value: string } => {
  const tokenLimit = tokenUsage.limit > 0 ? tokenUsage.limit : null;
  const remainingPercentage = computeRemainingPercentage(
    tokenUsage.used,
    tokenLimit
  );
  const usedText = tokenUsage.used.toLocaleString();
  const limitText = tokenLimit?.toLocaleString() ?? "unknown";
  return {
    title: `Context window: ${usedText} used, ${limitText} limit, ${remainingPercentage}% remaining`,
    value: `${usedText} (${remainingPercentage}%)`,
  };
};

const StatusPanel = ({
  status,
  connectionStatus,
  localModelOptions,
  onSelectClaudeModel,
  onSelectClaudeThinking,
  onSelectModel,
  onSelectReasoning,
  tokenDebugSummary,
}: StatusPanelProps) => {
  const { t } = useLocalization();
  const modelButtonRef = useRef<HTMLButtonElement | null>(null);
  const reasoningButtonRef = useRef<HTMLButtonElement | null>(null);
  const [openPicker, setOpenPicker] = useState<{
    readonly anchorLeft: number;
    readonly mode: StatusPanelPickerMode;
  } | null>(null);

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

  const tokensDisplay = formatContextWindowUsage(status.tokenUsage);

  const providerButtonClass = resolveProviderButtonClass(model.providerId);
  const canOpenPicker =
    model.providerId === "codexCli" ||
    model.providerId === "claudeCodeCli" ||
    model.providerId === "kimiCode" ||
    model.providerId === "glmNative" ||
    model.providerId === "glmOpenCode" ||
    model.providerId === "localModels";
  const reasoningText =
    typeof model.reasoning === "string" && model.reasoning.length > 0
      ? `(${model.reasoning})`
      : null;
  const openPickerForMode = (mode: StatusPanelPickerMode): void => {
    if (!canOpenPicker) {
      return;
    }
    const anchorElement =
      mode === "model"
        ? (reasoningButtonRef.current ?? modelButtonRef.current)
        : reasoningButtonRef.current;
    setOpenPicker({
      mode,
      anchorLeft: anchorElement?.offsetLeft ?? 0,
    });
  };
  const handlePickerSelectModel = (modelId: string): void => {
    if (model.providerId === "claudeCodeCli" && isClaudeModelAliasId(modelId)) {
      onSelectClaudeModel?.(modelId);
      return;
    }
    if (model.providerId === "codexCli") {
      onSelectModel?.(modelId);
      return;
    }
    if (
      model.providerId === "kimiCode" ||
      model.providerId === "glmNative" ||
      model.providerId === "glmOpenCode"
    ) {
      onSelectModel?.(modelId);
      return;
    }
    if (model.providerId === "localModels") {
      onSelectModel?.(modelId);
    }
  };
  const handlePickerSelectReasoning = (reasoning: string): void => {
    if (
      model.providerId === "claudeCodeCli" &&
      isClaudeThinkingSelection(reasoning)
    ) {
      onSelectClaudeThinking?.(reasoning);
      return;
    }
    if (model.providerId === "codexCli" && isCodexReasoningLevel(reasoning)) {
      onSelectReasoning?.(reasoning);
    }
  };

  return (
    <section
      className="session-status session-panel"
      style={{ position: "relative" }}
    >
      <div className="session-status-row">
        <span className="session-status-chip session-status-chip--label">
          {`${modelLabel}:`}
        </span>
        <button
          aria-label={`${modelLabel}: ${model.modelDisplayName}`}
          className={`session-status-button ${providerButtonClass}`}
          onClick={() => openPickerForMode("model")}
          ref={modelButtonRef}
          type="button"
        >
          {model.modelDisplayName}
        </button>
        {reasoningText ? (
          <button
            aria-label={`Reasoning ${reasoningText}`}
            className={`session-status-button ${providerButtonClass}`}
            onClick={() => openPickerForMode("reasoning")}
            ref={reasoningButtonRef}
            type="button"
          >
            {reasoningText}
          </button>
        ) : null}
        <span className="session-status-chip session-status-chip--limits">
          <span className="session-status-chip__label">{`${tokensLabel}:`}</span>
          <span
            className="session-status-chip__value"
            title={tokensDisplay.title}
          >
            {tokensDisplay.value}
          </span>
        </span>
      </div>
      {tokenDebugSummary ? (
        <div className="session-status__debug-strip">{tokenDebugSummary}</div>
      ) : null}
      {openPicker && canOpenPicker ? (
        <StatusPanelModelPicker
          anchorLeft={openPicker.anchorLeft}
          currentModelId={model.modelId}
          currentReasoning={model.reasoning}
          localModelOptions={localModelOptions}
          mode={openPicker.mode}
          onClose={() => setOpenPicker(null)}
          onSelectModel={handlePickerSelectModel}
          onSelectReasoning={handlePickerSelectReasoning}
          providerId={model.providerId}
        />
      ) : null}
    </section>
  );
};

export default StatusPanel;
