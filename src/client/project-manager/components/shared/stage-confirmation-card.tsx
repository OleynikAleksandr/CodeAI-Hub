import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import type { ProviderStackId } from "../../../../types/provider";
import { api } from "../../api";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import { resolvePreferredWorkflowProviderId } from "../../services/workflow-provider-resolver";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";

type ConfirmableStageId = "virtual_simulation" | "diagram_modules";

// Localization categories per UserFacing_Text_Localization_Boundary contract
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

const resolveUpstreamArtifactInfo = (
  stage: ConfirmableStageId,
  snapshot: WorkflowStateSnapshot,
  workspaceSlug: string
): UpstreamArtifactInfo => {
  if (stage === "virtual_simulation") {
    const finalPath = snapshot.description?.finalPath;
    return {
      fileName: "Final_Description.md",
      available: typeof finalPath === "string" && finalPath.length > 0,
    };
  }
  // diagram_modules — upstream is virtual-simulation.md
  const vsStageStatus = snapshot.stages.virtual_simulation;
  const hasVsArtifact =
    vsStageStatus === "in_progress" || vsStageStatus === "completed";
  // Also check gating: if diagram_modules is not blocked, upstream is available
  const blocked = snapshot.gating.blocked.diagram_modules ?? true;
  return {
    fileName: "virtual-simulation.md",
    available: hasVsArtifact || !blocked,
  };
};

export const hasExistingStageSession = (
  stage: ConfirmableStageId,
  snapshot: WorkflowStateSnapshot
): boolean => {
  const chains = snapshot.continuity?.chains ?? [];
  for (const chain of chains) {
    if (chain.stage !== stage) continue;
    if (chain.segments.length > 0) return true;
  }
  return false;
};

const startService = new WorkflowStepStartService();

export const StageConfirmationCard: React.FC<{
  readonly stage: ConfirmableStageId;
  readonly workflowSnapshot: WorkflowStateSnapshot;
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly onStarted: (sessionId: string) => void;
}> = (props) => {
  const { stage, workflowSnapshot, workspaceSlug, workspacePath, onStarted } =
    props;
  const { t } = useLocalization();
  const [startInFlight, setStartInFlight] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const upstream = resolveUpstreamArtifactInfo(
    stage,
    workflowSnapshot,
    workspaceSlug
  );
  const blocked = !upstream.available;
  const stageLabel = STAGE_LABELS[stage];
  const upstreamStageLabel = UPSTREAM_STAGE_LABELS[stage];

  const providers = api.getDescriptionProviders();
  const hasProviders = providers.length > 0;

  const handleStart = useCallback(() => {
    if (blocked || startInFlight || !hasProviders) return;
    setStartInFlight(true);
    setStartError(null);
    void (async () => {
      const providerId =
        resolvePreferredWorkflowProviderId({
          workflowState: workflowSnapshot,
          providers,
        }) ?? providers.at(0)?.id;
      if (!providerId) {
        throw new Error("No provider available.");
      }

      const onSessionCreated = (sessionId: string) => {
        onStarted(sessionId);
        // Dispatch pm:dialog:open so the left panel switches to the session
        window.dispatchEvent(
          new CustomEvent("pm:dialog:open", {
            detail: {
              providerId,
              providerSessionId: null,
              workspacePath,
              workspaceSlug,
              initiativeSlug: workspaceSlug,
              stage,
              sessionKind: "collector",
              runSlug: null,
            },
          })
        );
      };

      if (stage === "virtual_simulation") {
        await startService.startVirtualSimulation({
          workspacePath,
          workspaceSlug,
          providerId: providerId as ProviderStackId,
          onSessionCreated,
        });
      } else {
        await startService.startDiagramModules({
          workspacePath,
          workspaceSlug,
          providerId: providerId as ProviderStackId,
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
    blocked,
    hasProviders,
    onStarted,
    providers,
    stage,
    startInFlight,
    workflowSnapshot,
    workspacePath,
    workspaceSlug,
  ]);

  // UI Labels — short interface terms
  const titleText = t(
    UI_LABELS_CATEGORY,
    `pm.confirmation_card.title.${stage}`,
    stageLabel
  );
  const startLabel = t(
    UI_LABELS_CATEGORY,
    "pm.confirmation_card.start_button",
    "Start step"
  );
  const startingLabel = t(
    UI_LABELS_CATEGORY,
    "pm.confirmation_card.starting_button",
    "Starting..."
  );
  const availableLabel = t(
    UI_LABELS_CATEGORY,
    "pm.confirmation_card.artifact_available",
    "available"
  );
  const notFoundLabel = t(
    UI_LABELS_CATEGORY,
    "pm.confirmation_card.artifact_not_found",
    "not found"
  );

  // UI Helper Text — explanatory interface copy
  const inputLabel = t(
    UI_HELPER_TEXT_CATEGORY,
    "pm.confirmation_card.input_label",
    "This step will use the following artifact as input:"
  );
  const confirmText = t(
    UI_HELPER_TEXT_CATEGORY,
    "pm.confirmation_card.confirm_warning",
    `By clicking Start, you confirm that the ${upstreamStageLabel} artifact is complete and ready for the next step. The agent will begin working immediately.`
  );
  const blockedText = t(
    UI_HELPER_TEXT_CATEGORY,
    `pm.confirmation_card.blocked.${stage}`,
    `Complete the ${upstreamStageLabel} step first.`
  );

  // Messages for the User — runtime feedback
  const noProviderText = t(
    SYSTEM_FEEDBACK_CATEGORY,
    "pm.confirmation_card.no_provider",
    "No provider available for the agent."
  );

  return (
    <div className="pm-details" style={{ padding: "24px 20px" }}>
      <div style={{ marginBottom: 16 }}>
        <strong style={{ fontSize: 14 }}>{titleText}</strong>
      </div>

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
            <span style={{ marginLeft: 8, color: "var(--pm-accent-strong)", fontSize: 11 }}>
              {availableLabel}
            </span>
          ) : (
            <span style={{ marginLeft: 8, color: "#e5534b", fontSize: 11 }}>
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

        <div style={{ marginTop: 8 }}>
          <button
            className="pm-provider-picker__button pm-provider-picker__button--primary"
            disabled={blocked || startInFlight || !hasProviders}
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
        {!hasProviders && !blocked ? (
          <div style={{ color: "var(--pm-text-muted)", fontSize: 13, marginTop: 4 }}>
            {noProviderText}
          </div>
        ) : null}
      </div>
    </div>
  );
};
