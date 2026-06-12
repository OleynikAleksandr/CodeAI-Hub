import type { Session, SessionManager } from "../../session-manager";

export type PreliminaryReviewStage = "description" | "virtual_simulation";

const PRELIMINARY_REVIEW_LABELS: Record<PreliminaryReviewStage, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
};

const isPreliminaryReviewStage = (
  stage: string | null
): stage is PreliminaryReviewStage =>
  stage === "description" || stage === "virtual_simulation";

const hasOpenPreliminaryReviewGate = (
  session: Session,
  label: string
): boolean => {
  let open = false;
  for (const message of session.messages) {
    if (message.role !== "system") {
      continue;
    }
    if (
      message.tag === "managed-workflow-user-review" &&
      message.content.startsWith(
        `Core: ${label} перешёл в пользовательскую проверку.`
      )
    ) {
      open = true;
    }
    if (
      message.tag === "managed-workflow-complete" &&
      message.content.startsWith(`Core: ${label} завершён`)
    ) {
      open = false;
    }
  }
  return open;
};

export const resolvePreliminaryReviewOpenStages = (params: {
  readonly sessionManager?: SessionManager;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): ReadonlySet<PreliminaryReviewStage> => {
  const openStages = new Set<PreliminaryReviewStage>();
  for (const session of params.sessionManager?.listSessions() ?? []) {
    if (
      session.workspacePath !== params.workspaceRoot ||
      session.initiativeSlug !== params.workspaceSlug ||
      !isPreliminaryReviewStage(session.stage)
    ) {
      continue;
    }
    const label = PRELIMINARY_REVIEW_LABELS[session.stage];
    if (hasOpenPreliminaryReviewGate(session, label)) {
      openStages.add(session.stage);
    }
  }
  return openStages;
};
