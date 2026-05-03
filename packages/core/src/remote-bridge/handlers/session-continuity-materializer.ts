import type { ContinuityIndexEntry } from "../../session-continuity/index-registry";
import type { SessionManager } from "../../session-manager";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { SessionProviderBindingService } from "./session-provider-binding-service";

export interface SessionContinuityMaterializerDependencies {
  readonly providerBindingService: SessionProviderBindingService;
  readonly sessionManager: SessionManager;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}

// Materializes stub runtime sessions for continuity entries that Core
// has not yet seen as runtime session objects. PM needs each reopened
// dialog to have a runtime session in workspace snapshot; without it
// input stays locked in the initial "running" state because the snapshot
// reconciliation loop never finds a matching session id to flip to idle.
//
// The stub is intentionally paper-only: Session object with ready status
// and provider session binding, but no adapter turn is started. Real
// provider resume happens lazily on the first user message through the
// existing resolveProviderSessionId dispatch path.
export const materializeContinuityEntries = (options: {
  readonly deps: SessionContinuityMaterializerDependencies;
  readonly entries: readonly ContinuityIndexEntry[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): void => {
  const initiativeSlug = options.workspaceSlug.trim();
  for (const entry of options.entries) {
    const sessionId = entry.latestSessionId?.trim();
    const providerId = entry.providerId?.trim();
    const providerSessionId = entry.providerSessionId?.trim();
    if (!(sessionId && providerId && providerSessionId)) {
      continue;
    }
    if (options.deps.sessionManager.getSession(sessionId)) {
      continue;
    }
    const session = options.deps.sessionManager.registerSessionWithId({
      sessionId,
      providerId,
      workspacePath: options.workspaceRoot,
      providerSessionId,
      stage: entry.stage,
      initiativeSlug,
    });
    if (entry.modelBinding) {
      options.deps.sessionManager.setModelBinding(
        sessionId,
        entry.modelBinding
      );
    }
    options.deps.providerBindingService.registerRestoredBinding({
      sessionId,
      providerId,
      providerSessionId,
    });
    options.deps.workspaceRuntime?.notifySessionCreated(
      {
        workspaceRoot: options.workspaceRoot,
        nodeId: session.stage ?? "session",
        sessionId: session.id,
      },
      {
        nodeId: session.stage ?? "session",
        providerId: session.providerId,
        providerSessionId: session.providerSessionId ?? undefined,
        bindingStatus: session.providerSessionStatus,
      }
    );
  }
};
