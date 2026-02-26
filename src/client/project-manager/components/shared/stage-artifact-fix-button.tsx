import type React from "react";
import { useRef, useState } from "react";
import { api } from "../../api";
import { resolvePreferredWorkflowProviderId } from "../../services/workflow-provider-resolver";

/**
 * "Fix with agent" button shared across all stage artifact panels.
 * Resolves the preferred provider and calls the provided `onStart` callback.
 */
export const StageArtifactFixButton: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly onStart: (params: {
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly providerId: string;
  }) => Promise<void>;
}> = (props) => {
  const [fixInFlight, setFixInFlight] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const providers = api.getIdeaCollectorProviders();
  const hasProviders = providers.length > 0;

  return (
    <>
      <button
        className="pm-provider-picker__button pm-provider-picker__button--primary"
        disabled={fixInFlight || !hasProviders}
        onClick={() => {
          if (!hasProviders || fixInFlight) {
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
                providers,
              }) ?? providers.at(0)?.id;
            if (!providerId) {
              throw new Error("Нет доступного провайдера для агента.");
            }
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
        {fixInFlight ? "Открываю сессию…" : "Исправить с агентом"}
      </button>
      {fixError ? <div style={{ marginTop: 10 }}>{fixError}</div> : null}
      {!hasProviders ? (
        <div style={{ marginTop: 10 }}>Нет доступного провайдера для агента.</div>
      ) : null}
    </>
  );
};
