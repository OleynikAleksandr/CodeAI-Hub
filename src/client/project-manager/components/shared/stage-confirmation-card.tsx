import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { api } from "../../api";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import {
  isResearchCapableProviderId,
  resolvePreferredWorkflowProviderId,
} from "../../services/workflow-provider-resolver";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { useWorkspaceSettingsPayload } from "../../services/workspace-settings-payload-hook";
import { CaptureWorkbenchDomListboxSelector } from "../capture-workbench/dom-listbox-selector";
import { PROVIDER_TINT_TOKENS } from "./stage-confirmation-card-provider-tint";
import {
  getStartCardModelOptions,
  getStartCardReasoningOptions,
  resolveDefaultStartCardModelSelection,
} from "./stage-start-model-selection";
import {
  STAGE_LABELS,
  UPSTREAM_STAGE_LABELS,
  type ConfirmableStageId,
  type StageSessionIntent,
  hasExistingStageSession,
  resolveDisplayedArtifactName,
  resolveInheritedStageProviderId,
  resolveStageSessionIntent,
  resolveUpstreamArtifactInfo,
} from "./stage-confirmation-card-workflow";

export { hasExistingStageSession, resolveStageSessionIntent };
export type { ConfirmableStageId, StageSessionIntent };

const UI_LABELS_CATEGORY = "ui_interface";
const UI_HELPER_TEXT_CATEGORY = "user_guidance";
const SYSTEM_FEEDBACK_CATEGORY = "system_feedback";
const MUTED_TEXT_STYLE: React.CSSProperties = {
  color: "var(--pm-text-muted)",
  fontSize: 13,
};
const ARTIFACT_BOX_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontFamily: "monospace",
  fontSize: 13,
  padding: "8px 12px",
};
const PROVIDER_LABEL_STYLE: React.CSSProperties = {
  color: "var(--pm-text-muted)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const HIDDEN_INPUT_STYLE: React.CSSProperties = {
  opacity: 0,
  pointerEvents: "none",
  position: "absolute",
};
const SELECT_GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};
const isProviderStackId = (value: unknown): value is ProviderStackId =>
  value === "claudeCodeCli" ||
  value === "codexCli" ||
  value === "geminiCli" ||
  value === "kimiCode" ||
  value === "glmNative" ||
  value === "glmOpenCode" ||
  value === "localModels";

const startService = new WorkflowStepStartService();

export const StageConfirmationCard: React.FC<{
  readonly stage: ConfirmableStageId;
  readonly workflowSnapshot: WorkflowStateSnapshot;
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly onStarted: (sessionId: string, intent: StageSessionIntent) => void;
}> = (props) => {
  const { stage, workflowSnapshot, workspaceSlug, workspacePath, onStarted } =
    props;
  const { availableEngines, t } = useLocalization();
  const [startInFlight, setStartInFlight] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] =
    useState<ProviderStackId | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedReasoning, setSelectedReasoning] = useState<string | null>(
    null
  );
  const mountedRef = useRef(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const selectionScopeKeyRef = useRef<string | null>(null);
  const settingsPayload = useWorkspaceSettingsPayload({
    workspacePath,
    workspaceSlug,
  });

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const uiLabel = (key: string, fallback: string, replacements?: Record<string, string>) =>
    t(UI_LABELS_CATEGORY, key, fallback, replacements);
  const helperText = (
    key: string,
    fallback: string,
    replacements?: Record<string, string>
  ) => t(UI_HELPER_TEXT_CATEGORY, key, fallback, replacements);
  const userMessage = (key: string, fallback: string) =>
    t(SYSTEM_FEEDBACK_CATEGORY, key, fallback);

  const upstream = resolveUpstreamArtifactInfo(stage, workflowSnapshot);
  const blocked = !upstream.available;
  const dirtyFiles = workflowSnapshot.gating.dirtyFiles ?? [];
  const blockedByDirtyGit = blocked && dirtyFiles.length > 0;
  const displayedArtifactName = resolveDisplayedArtifactName(
    upstream,
    blockedByDirtyGit
  );
  const managedPreviewStage =
    workflowSnapshot.managedWorkflowPreview?.stages.find(
      (item) => item.controllerId === stage
    ) ?? null;
  const managedPreviewBlocked =
    managedPreviewStage?.startPolicy === "core_preview_boundary";

  const providers = api
    .getDescriptionProviders()
    .filter((provider) => stage !== "quality_gates" || isResearchCapableProviderId(provider.id));
  const defaultProviderId =
    resolvePreferredWorkflowProviderId({
      workflowState: workflowSnapshot,
      providers,
      stage,
    }) ?? null;
  const inheritedProviderId = resolveInheritedStageProviderId(
    stage,
    workflowSnapshot
  );
  const selectedProvider =
    providers.find((provider) => provider.id === selectedProviderId) ?? null;
  const modelOptions = useMemo(
    () =>
      selectedProviderId
        ? getStartCardModelOptions(selectedProviderId, availableEngines)
        : [],
    [availableEngines, selectedProviderId]
  );
  const reasoningOptions = useMemo(
    () =>
      selectedProviderId && selectedModelId
        ? getStartCardReasoningOptions(selectedProviderId, selectedModelId)
        : [],
    [selectedModelId, selectedProviderId]
  );
  const hasReasoningOptions = reasoningOptions.length > 0;
  const hasConnectedProviders = providers.some((provider) => provider.connected);
  const isUsingInheritedProvider =
    inheritedProviderId !== null && selectedProviderId === inheritedProviderId;
  const canStart =
    !blocked &&
    !managedPreviewBlocked &&
    !startInFlight &&
    selectedProviderId !== null &&
    selectedProvider?.connected === true &&
    (selectedProviderId !== "localModels" || modelOptions.length > 0);

  useEffect(() => {
    const scopeKey = `${workspaceSlug}:${stage}`;
    const isScopeChange = selectionScopeKeyRef.current !== scopeKey;
    selectionScopeKeyRef.current = scopeKey;

    setSelectedProviderId((current) => {
      if (isScopeChange) {
        return defaultProviderId;
      }
      const currentProvider = providers.find((provider) => provider.id === current);
      if (currentProvider?.connected) {
        return current;
      }
      return defaultProviderId;
    });
  }, [defaultProviderId, providers, stage, workspaceSlug]);

  useEffect(() => {
    if (!selectedProviderId) {
      setSelectedModelId(null);
      setSelectedReasoning(null);
      return;
    }
    const selection = resolveDefaultStartCardModelSelection(
      settingsPayload,
      selectedProviderId,
      availableEngines
    );
    setSelectedModelId(selection.modelId);
    setSelectedReasoning(selection.reasoning);
  }, [availableEngines, selectedProviderId, settingsPayload]);

  useEffect(() => {
    if (reasoningOptions.length === 0) {
      return;
    }
    const reasoningStillSupported = reasoningOptions.some(
      (option) => option.id === selectedReasoning
    );
    if (!reasoningStillSupported) {
      setSelectedReasoning(reasoningOptions[0]?.id ?? null);
    }
  }, [reasoningOptions, selectedReasoning]);

  const providerTitle =
    selectedProvider?.title ??
    providers.find((provider) => provider.id === inheritedProviderId)?.title ??
    "Provider";
  const titleText = uiLabel(`pm.confirmation_card.title.${stage}`, STAGE_LABELS[stage]);
  const startLabel = uiLabel("pm.confirmation_card.start_button", "Start step");
  const startingLabel = uiLabel(
    "pm.confirmation_card.starting_button",
    "Starting..."
  );
  const availableLabel = uiLabel("pm.confirmation_card.artifact_available", "available");
  const notFoundLabel = uiLabel("pm.confirmation_card.artifact_not_found", "not found");
  const cleanupRequiredLabel = uiLabel(
    "pm.confirmation_card.artifact_cleanup_required",
    "cleanup required"
  );
  const providerLabelText = uiLabel("pm.confirmation_card.provider_label", "Agent provider");
  const modelLabelText = uiLabel("pm.confirmation_card.model_label", "Model");
  const reasoningLabelText = uiLabel(
    "pm.confirmation_card.reasoning_label",
    "Reasoning"
  );
  const previousStepBadgeText = uiLabel(
    "pm.confirmation_card.previous_provider_badge",
    "previous step"
  );
  const inputLabel = helperText(
    "pm.confirmation_card.input_label",
    "This step will use the following artifact as input:"
  );
  const confirmText = helperText(
    "pm.confirmation_card.confirm_warning",
    "By clicking Start, you confirm that the {upstreamStage} artifact is complete and ready for the next step. The agent will begin working immediately.",
    { upstreamStage: UPSTREAM_STAGE_LABELS[stage] }
  );
  const blockedText = helperText(
    blockedByDirtyGit
      ? "pm.confirmation_card.blocked.dirty_git"
      : `pm.confirmation_card.blocked.${stage}`,
    blockedByDirtyGit
      ? "Core found workspace Git changes that must be committed, cleaned up, or reviewed before this step can start: {files}"
      : `Complete the ${UPSTREAM_STAGE_LABELS[stage]} step first.`,
    { files: dirtyFiles.slice(0, 5).join(", ") }
  );
  const selectedProviderHintText = helperText(
    isUsingInheritedProvider
      ? "pm.confirmation_card.selected_provider_hint"
      : "pm.confirmation_card.selected_provider_override_hint",
    isUsingInheritedProvider
      ? "{providerTitle} is preselected from the previous step. You can switch to any available provider before launch. If you do nothing, Start step will continue with that provider."
      : "{providerTitle} is selected for this step. Start step will launch the new session on that provider, and you can still switch before launch.",
    { providerTitle }
  );
  const noProviderText = userMessage("pm.confirmation_card.no_provider", "No provider available for the agent.");
  const handleStart = useCallback(() => {
    if (!canStart || !selectedProviderId) {
      return;
    }
    setStartInFlight(true);
    setStartError(null);
    void (async () => {
      const onSessionCreated = (sessionId: string) => {
        const intent: StageSessionIntent = {
          providerId: selectedProviderId,
          providerSessionId: null,
          workspacePath,
          workspaceSlug,
          initiativeSlug: workspaceSlug,
          stage,
          sessionKind: "collector",
          runSlug: null,
        };
        const cardEl = cardRef.current;
        if (cardEl) {
          cardEl.classList.add("pm-confirmation-card--fading");
        }
        const switchDelay = cardEl ? 300 : 0;
        window.setTimeout(() => {
          onStarted(sessionId, intent);
        }, switchDelay);
      };

      const startParams = {
        workspacePath,
        workspaceSlug,
        providerId: selectedProviderId,
        modelId: selectedModelId,
        reasoning: selectedReasoning,
        onSessionCreated,
      };
      if (stage === "virtual_simulation") {
        await startService.startVirtualSimulation(startParams);
      } else if (stage === "diagram_modules") {
        await startService.startDiagramModules(startParams);
      } else if (stage === "application_skeleton") {
        await startService.startApplicationSkeleton(startParams);
      } else {
        await startService.startQualityGates(startParams);
      }
    })()
      .catch((error: unknown) => {
        if (mountedRef.current) {
          setStartError(
            error instanceof Error ? error.message : String(error)
          );
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setStartInFlight(false);
        }
      });
  }, [
    canStart,
    onStarted,
    selectedProviderId,
    selectedModelId,
    selectedReasoning,
    stage,
    workspacePath,
    workspaceSlug,
  ]);

  const btnClassName = startInFlight
    ? "pm-provider-picker__button pm-provider-picker__button--primary pm-confirmation-card__start-btn--starting"
    : "pm-provider-picker__button pm-provider-picker__button--primary";

  return (
    <div className="pm-details" ref={cardRef} style={{ padding: "24px 20px" }}>
      <strong style={{ display: "block", fontSize: 14, marginBottom: 16 }}>
        {titleText}
      </strong>

      <div style={{ display: "grid", gap: 12 }}>
        <div>{inputLabel}</div>
        <div style={ARTIFACT_BOX_STYLE}>
          <code>{displayedArtifactName}</code>
          {upstream.available ? (
            <span
              style={{ color: "var(--pm-accent-strong)", fontSize: 11, marginLeft: 8 }}
            >
              {availableLabel}
            </span>
          ) : (
            <span style={{ color: "#e5534b", fontSize: 11, marginLeft: 8 }}>
              {blockedByDirtyGit ? cleanupRequiredLabel : notFoundLabel}
            </span>
          )}
        </div>

        {blocked ? (
          <div style={MUTED_TEXT_STYLE}>{blockedText}</div>
        ) : (
          <div style={MUTED_TEXT_STYLE}>{confirmText}</div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          <div style={PROVIDER_LABEL_STYLE}>{providerLabelText}</div>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {providers.map((provider) => {
              const isSelected = provider.id === selectedProviderId;
              const isInherited = provider.id === inheritedProviderId;
              const isDisabled = !provider.connected || startInFlight;
              const tint =
                isSelected && isProviderStackId(provider.id)
                  ? PROVIDER_TINT_TOKENS[provider.id]
                  : null;
              const pillFill = tint?.fill ?? "rgba(255,255,255,0.03)";
              const pillBorder = tint?.border ?? "rgba(255,255,255,0.08)";
              const pillColor = tint?.accent ?? "var(--pm-text-muted)";
              const badgeFill =
                tint?.badgeBackground ?? "rgba(255,255,255,0.06)";
              const badgeColor = tint?.accent ?? "rgba(219, 228, 238, 0.56)";
              return (
                <label
                  key={provider.id}
                  aria-disabled={isDisabled}
                  style={{
                    alignItems: "center",
                    background: pillFill,
                    border: `1px solid ${pillBorder}`,
                    borderRadius: 999,
                    color: pillColor,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    gap: 8,
                    opacity: isDisabled ? 0.48 : 1,
                    padding: "8px 12px",
                  }}
                >
                  <input
                    checked={isSelected}
                    disabled={isDisabled}
                    name={`pm-stage-provider-${stage}`}
                    onChange={() => setSelectedProviderId(provider.id)}
                    style={HIDDEN_INPUT_STYLE}
                    type="radio"
                  />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {provider.title}
                  </span>
                  {isInherited ? (
                    <span
                      style={{
                        alignItems: "center",
                        background: badgeFill,
                        borderRadius: 999,
                        color: badgeColor,
                        display: "inline-flex",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        padding: "2px 7px",
                      }}
                    >
                      {previousStepBadgeText}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
          {hasConnectedProviders && selectedProvider ? (
            <div style={{ color: "var(--pm-text-muted)", fontSize: 12 }}>
              {selectedProviderHintText}
            </div>
          ) : null}
        </div>

        {selectedProvider ? (
          <div style={SELECT_GRID_STYLE}>
            <CaptureWorkbenchDomListboxSelector
              label={modelLabelText}
              onChange={setSelectedModelId}
              options={modelOptions.map((option) => ({
                label: option.label,
                title: option.description,
                value: option.id,
              }))}
              value={selectedModelId ?? ""}
            />
            {hasReasoningOptions ? (
              <CaptureWorkbenchDomListboxSelector
                label={reasoningLabelText}
                onChange={setSelectedReasoning}
                options={reasoningOptions.map((option) => ({
                  label: option.label,
                  value: option.id,
                }))}
                value={selectedReasoning ?? ""}
              />
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: 8 }}>
          <button
            className={btnClassName}
            disabled={!canStart}
            onClick={handleStart}
            type="button"
          >
            {startInFlight ? startingLabel : startLabel}
          </button>
        </div>

        {startError ? (
          <div style={{ color: "#e5534b", fontSize: 13, marginTop: 4 }}>
            {startError}
          </div>
        ) : null}
        {!hasConnectedProviders && !blocked ? (
          <div style={{ ...MUTED_TEXT_STYLE, marginTop: 4 }}>
            {noProviderText}
          </div>
        ) : null}
      </div>
    </div>
  );
};
