import type React from "react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { resolvePreferredWorkflowProviderId } from "../../services/workflow-provider-resolver";

type RepairableStageId =
  | "virtual_simulation"
  | "diagram_modules";

const resolveMostRecentContinuitySessionId = (
  state: Awaited<ReturnType<typeof api.getWorkflowState>> | null,
  stage: RepairableStageId
): string | null => {
  const chains = state?.continuity?.chains ?? [];
  let best: { readonly updatedAt: string; readonly sessionId: string } | null = null;

  for (const chain of chains) {
    if (chain.stage !== stage) {
      continue;
    }
    const sessionId = chain.segments.at(-1)?.sessionId ?? null;
    if (!sessionId) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = { updatedAt: chain.updatedAt, sessionId };
    }
  }

  return best?.sessionId ?? null;
};

const sleep = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const waitForStageSessionId = async (params: {
  readonly stage: RepairableStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<string | null> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const workflowState = await api.getWorkflowState(
      params.workspaceSlug,
      params.workspacePath
    );
    const sessionId = resolveMostRecentContinuitySessionId(
      workflowState,
      params.stage
    );
    if (sessionId) {
      return sessionId;
    }
    await sleep(150);
  }
  return null;
};

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
  readonly repairPrompt?: string | null;
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

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const providers = api.getDescriptionProviders();
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
            const repairPrompt = props.repairPrompt?.trim() ?? "";
            if (repairPrompt.length > 0) {
              const sessionId = await waitForStageSessionId({
                stage: props.stage,
                workspacePath: props.workspacePath,
                workspaceSlug: props.workspaceSlug,
              });
              if (!sessionId) {
                throw new Error("Не удалось дождаться активной dialog session для исправления.");
              }
              api.sendSessionMessage(sessionId, repairPrompt);
            }
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
