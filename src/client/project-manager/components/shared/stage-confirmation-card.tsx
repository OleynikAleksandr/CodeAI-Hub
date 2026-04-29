import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { api } from "../../api";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import { resolvePreferredWorkflowProviderId } from "../../services/workflow-provider-resolver";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { PROVIDER_TINT_TOKENS } from "./stage-confirmation-card-provider-tint";

type ConfirmableStageId = "virtual_simulation" | "diagram_modules";

const UI_LABELS_CATEGORY = "ui_interface";
const UI_HELPER_TEXT_CATEGORY = "user_guidance";
const SYSTEM_FEEDBACK_CATEGORY = "system_feedback";

const STAGE_LABELS: Record<ConfirmableStageId, string> = {
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
};

const UPSTREAM_STAGE_LABELS: Record<ConfirmableStageId, string> = {
  virtual_simulation: "Description",
  diagram_modules: "Virtual Simulation",
};

type UpstreamArtifactInfo = {
  readonly fileName: string;
  readonly available: boolean;
};

const isProviderStackId = (value: unknown): value is ProviderStackId =>
  value === "claudeCodeCli" || value === "codexCli" || value === "geminiCli";

const resolveUpstreamArtifactInfo = (
  stage: ConfirmableStageId,
  snapshot: WorkflowStateSnapshot
): UpstreamArtifactInfo => {
  if (stage === "virtual_simulation") {
    const finalPath = snapshot.description?.finalPath;
    return {
      fileName: "Final_Description.md",
      available: typeof finalPath === "string" && finalPath.length > 0,
    };
  }
  const vsStageStatus = snapshot.stages.virtual_simulation;
  const hasVsArtifact =
    vsStageStatus === "in_progress" || vsStageStatus === "completed";
  const blocked = snapshot.gating.blocked.diagram_modules ?? true;
  return {
    fileName: "virtual-simulation.md",
    available: hasVsArtifact || !blocked,
  };
};

const resolveLatestChainSegment = (
  snapshot: WorkflowStateSnapshot,
  stage: string
): { readonly providerId: string; readonly providerSessionId: string } | null => {
  const chains = snapshot.continuity?.chains ?? [];
  let best:
    | {
        readonly updatedAt: string;
        readonly providerId: string;
        readonly providerSessionId: string;
      }
    | null = null;
  for (const chain of chains) {
    if (chain.stage !== stage) continue;
    const last = chain.segments.at(-1);
    if (!last) continue;
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = {
        updatedAt: chain.updatedAt,
        providerId: last.providerId,
        providerSessionId: last.providerSessionId,
      };
    }
  }
  return best;
};

const resolveInheritedStageProviderId = (
  stage: ConfirmableStageId,
  snapshot: WorkflowStateSnapshot
): ProviderStackId | null => {
  const descriptionProviderId = snapshot.description?.primarySession?.providerId;
  if (stage === "virtual_simulation") {
    return isProviderStackId(descriptionProviderId)
      ? descriptionProviderId
      : null;
  }

  const virtualSimulationProviderId =
    resolveLatestChainSegment(snapshot, "virtual_simulation")?.providerId;
  if (isProviderStackId(virtualSimulationProviderId)) {
    return virtualSimulationProviderId;
  }

  return isProviderStackId(descriptionProviderId)
    ? descriptionProviderId
    : null;
};

export const hasExistingStageSession = (
  stage: ConfirmableStageId,
  snapshot: WorkflowStateSnapshot
): boolean => resolveLatestChainSegment(snapshot, stage) !== null;

export type StageSessionIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly sessionKind: "collector" | null;
  readonly runSlug: string | null;
};

export const resolveStageSessionIntent = (
  stage: string,
  snapshot: WorkflowStateSnapshot,
  workspacePath: string,
  workspaceSlug: string
): StageSessionIntent | null => {
  if (stage === "description") {
    const session = snapshot.description?.primarySession;
    if (!session) return null;
    return {
      providerId: session.providerId,
      providerSessionId: session.providerSessionId,
      workspacePath,
      workspaceSlug,
      initiativeSlug: workspaceSlug,
      stage: "description",
      sessionKind: "collector",
      runSlug: null,
    };
  }
  const segment = resolveLatestChainSegment(snapshot, stage);
  if (!segment) return null;
  return {
    providerId: segment.providerId,
    providerSessionId: segment.providerSessionId,
    workspacePath,
    workspaceSlug,
    initiativeSlug: workspaceSlug,
    stage,
    sessionKind: "collector",
    runSlug: null,
  };
};

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
  const { t } = useLocalization();
  const [startInFlight, setStartInFlight] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] =
    useState<ProviderStackId | null>(null);
  const mountedRef = useRef(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const selectionScopeKeyRef = useRef<string | null>(null);

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

  const providers = api.getDescriptionProviders();
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
  const hasConnectedProviders = providers.some((provider) => provider.connected);
  const isUsingInheritedProvider =
    inheritedProviderId !== null && selectedProviderId === inheritedProviderId;
  const canStart =
    !blocked &&
    !startInFlight &&
    selectedProviderId !== null &&
    selectedProvider?.connected === true;

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
  const providerLabelText = uiLabel("pm.confirmation_card.provider_label", "Agent provider");
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
    `pm.confirmation_card.blocked.${stage}`,
    `Complete the ${UPSTREAM_STAGE_LABELS[stage]} step first.`
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

      if (stage === "virtual_simulation") {
        await startService.startVirtualSimulation({
          workspacePath,
          workspaceSlug,
          providerId: selectedProviderId,
          onSessionCreated,
        });
      } else {
        await startService.startDiagramModules({
          workspacePath,
          workspaceSlug,
          providerId: selectedProviderId,
          onSessionCreated,
        });
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
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            fontFamily: "monospace",
            fontSize: 13,
          }}
        >
          <code>{upstream.fileName}</code>
          {upstream.available ? (
            <span
              style={{ color: "var(--pm-accent-strong)", fontSize: 11, marginLeft: 8 }}
            >
              {availableLabel}
            </span>
          ) : (
            <span style={{ color: "#e5534b", fontSize: 11, marginLeft: 8 }}>
              {notFoundLabel}
            </span>
          )}
        </div>

        {blocked ? (
          <div style={{ color: "var(--pm-text-muted)", fontSize: 13 }}>
            {blockedText}
          </div>
        ) : (
          <div style={{ color: "var(--pm-text-muted)", fontSize: 13 }}>
            {confirmText}
          </div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              color: "var(--pm-text-muted)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {providerLabelText}
          </div>
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
                    style={{
                      opacity: 0,
                      pointerEvents: "none",
                      position: "absolute",
                    }}
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
          <div
            style={{ color: "var(--pm-text-muted)", fontSize: 13, marginTop: 4 }}
          >
            {noProviderText}
          </div>
        ) : null}
      </div>
    </div>
  );
};
