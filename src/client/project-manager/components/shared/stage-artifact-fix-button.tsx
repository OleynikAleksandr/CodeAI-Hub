import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { api } from "../../api";
import { resolvePreferredWorkflowProviderId } from "../../services/workflow-provider-resolver";

type RepairableStageId =
  | "virtual_simulation"
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

const USER_MESSAGES_CATEGORY = "system_feedback";

const openDialogSession = (params: {
  readonly providerId: string;
  readonly stage: RepairableStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): void => {
  window.dispatchEvent(
    new CustomEvent("pm:dialog:open", {
      detail: {
        providerId: params.providerId,
        providerSessionId: null,
        workspacePath: params.workspacePath,
        workspaceSlug: params.workspaceSlug,
        initiativeSlug: params.workspaceSlug,
        stage: params.stage,
        sessionKind: "collector",
        runSlug: null,
      },
    })
  );
};

/**
 * "Fix with agent" button shared across all stage artifact panels.
 * Resolves the preferred provider and calls the provided `onStart` callback.
 */
export const StageArtifactFixButton: React.FC<{
  readonly stage: RepairableStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly onStart: (params: {
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly providerId: string;
  }) => Promise<void>;
}> = (props) => {
  const { t } = useLocalization();
  const [fixInFlight, setFixInFlight] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const providers = api.getDescriptionProviders();
  const connectedProviders = providers.filter((provider) => provider.connected);
  const hasConnectedProviders = connectedProviders.length > 0;
  const noProviderMessage = t(
    USER_MESSAGES_CATEGORY,
    "pm.stage_artifact.repair.error.no_provider",
    "No provider available for the agent."
  );
  const fixIdleLabel = t(
    USER_MESSAGES_CATEGORY,
    "pm.stage_artifact.repair.idle_label",
    "Fix with agent"
  );
  const fixPendingLabel = t(
    USER_MESSAGES_CATEGORY,
    "pm.stage_artifact.repair.pending_label",
    "Opening session…"
  );

  return (
    <>
      <button
        className="pm-provider-picker__button pm-provider-picker__button--primary"
        disabled={fixInFlight || !hasConnectedProviders}
        onClick={() => {
          if (!hasConnectedProviders || fixInFlight) {
            return;
          }
          setFixInFlight(true);
          setFixError(null);
          void (async () => {
            const workflowState = await api.getWorkflowState(
              props.workspaceSlug,
              props.workspacePath
            );
            const providerId =
              resolvePreferredWorkflowProviderId({
                workflowState,
                providers: connectedProviders,
              }) ?? connectedProviders.at(0)?.id;
            if (!providerId) {
              throw new Error(noProviderMessage);
            }
            openDialogSession({
              providerId,
              stage: props.stage,
              workspacePath: props.workspacePath,
              workspaceSlug: props.workspaceSlug,
            });
            await props.onStart({
              workspacePath: props.workspacePath,
              workspaceSlug: props.workspaceSlug,
              providerId,
            });
          })()
            .catch((startError: unknown) => {
              if (mountedRef.current) {
                setFixError(
                  startError instanceof Error ? startError.message : String(startError)
                );
              }
            })
            .finally(() => {
              if (mountedRef.current) {
                setFixInFlight(false);
              }
            });
        }}
        type="button"
      >
        {fixInFlight ? fixPendingLabel : fixIdleLabel}
      </button>
      {fixError ? <div style={{ marginTop: 10 }}>{fixError}</div> : null}
      {!hasConnectedProviders ? (
        <div style={{ marginTop: 10 }}>{noProviderMessage}</div>
      ) : null}
    </>
  );
};
