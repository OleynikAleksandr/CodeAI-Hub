import { useEffect, useMemo, useState } from "react";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import type {
  DescriptionSessionRef,
  WorkflowStateSnapshot,
} from "../../services/workflow-state-client";

type ReviewerSessionVisibility = {
  readonly forcedHiddenSessionIds: ReadonlySet<string>;
  readonly reviewerSessionId: string | null;
};

type DescriptionSessionSnapshot = {
  readonly kind: "collector" | "reviewer";
  readonly session: DescriptionSessionRef;
  readonly terminalNoResume: boolean;
};

const resolveDescriptionSessionSnapshot = (
  state: WorkflowStateSnapshot | null
): DescriptionSessionSnapshot | null => {
  const description = state?.description;
  if (!description?.session || !description.sessionKind) {
    return null;
  }
  return {
    kind: description.sessionKind,
    session: description.session,
    terminalNoResume:
      description.sessionKind === "collector" && Boolean(description.draftPath),
  };
};

const resolveWorkspaceSlug = (
  sessions: readonly SessionRecord[],
  workspacePath?: string
): string | null => {
  if (!workspacePath) {
    return null;
  }
  for (const session of sessions) {
    if (session.workspacePath === workspacePath && session.initiativeSlug) {
      return session.initiativeSlug;
    }
  }
  return null;
};

const resolveReviewerSessionId = (params: {
  readonly sessions: readonly SessionRecord[];
  readonly workspacePath?: string;
  readonly descriptionSessionSnapshot: DescriptionSessionSnapshot | null;
}): string | null => {
  if (
    !params.workspacePath ||
    !params.descriptionSessionSnapshot ||
    params.descriptionSessionSnapshot.kind !== "reviewer"
  ) {
    return null;
  }
  const candidates = params.sessions.filter(
    (session) =>
      session.workspacePath === params.workspacePath &&
      session.stage === "description"
  );
  if (candidates.length === 0) {
    return null;
  }
  const providerId = params.descriptionSessionSnapshot.session.providerId;
  const providerSessionId =
    params.descriptionSessionSnapshot.session.providerSessionId;
  const matchesProvider = (session: SessionRecord) =>
    session.providerIds.some((id) => id === providerId);
  let matched = candidates.find(
    (session) =>
      matchesProvider(session) &&
      session.binding.providerSessionId === providerSessionId
  );
  if (!matched) {
    matched = candidates.find((session) => matchesProvider(session));
  }
  if (!matched) {
    matched = candidates.reduce((latest, session) =>
      session.createdAt > latest.createdAt ? session : latest
    );
  }
  return matched.id;
};

const buildForcedHiddenSessionIds = (params: {
  readonly sessions: readonly SessionRecord[];
  readonly workspacePath?: string;
  readonly reviewerSessionId: string | null;
  readonly descriptionSessionSnapshot: DescriptionSessionSnapshot | null;
}): ReadonlySet<string> => {
  if (!params.workspacePath) {
    return new Set();
  }
  const hidden = new Set<string>();
  const hideTerminalCollectors =
    params.reviewerSessionId === null &&
    params.descriptionSessionSnapshot?.terminalNoResume === true;
  for (const session of params.sessions) {
    if (
      session.workspacePath === params.workspacePath &&
      session.stage === "description" &&
      (hideTerminalCollectors || session.id !== params.reviewerSessionId)
    ) {
      hidden.add(session.id);
    }
  }
  return hidden;
};

export const useReviewerSessionVisibility = (params: {
  readonly sessions: readonly SessionRecord[];
  readonly workspacePath?: string;
}): ReviewerSessionVisibility => {
  const [descriptionSessionSnapshot, setDescriptionSessionSnapshot] =
    useState<DescriptionSessionSnapshot | null>(null);
  const workspaceSlug = useMemo(
    () => resolveWorkspaceSlug(params.sessions, params.workspacePath),
    [params.sessions, params.workspacePath]
  );

  useEffect(() => {
    if (!workspaceSlug) {
      setDescriptionSessionSnapshot(null);
      return;
    }
    let cancelled = false;
    let timer = 0;
    let fastPolling = true;
    const loadState = async () => {
      const state = await api.getWorkflowState(
        workspaceSlug,
        params.workspacePath
      );
      if (cancelled) {
        return;
      }
      if (state && fastPolling) {
        fastPolling = false;
        window.clearInterval(timer);
        timer = window.setInterval(loadState, 10_000);
      }
      setDescriptionSessionSnapshot(resolveDescriptionSessionSnapshot(state));
    };
    loadState();
    timer = window.setInterval(loadState, 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [params.workspacePath, workspaceSlug]);

  const reviewerSessionId = useMemo(
    () =>
      resolveReviewerSessionId({
        sessions: params.sessions,
        workspacePath: params.workspacePath,
        descriptionSessionSnapshot,
      }),
    [descriptionSessionSnapshot, params.sessions, params.workspacePath]
  );

  const forcedHiddenSessionIds = useMemo(
    () =>
      buildForcedHiddenSessionIds({
        sessions: params.sessions,
        workspacePath: params.workspacePath,
        reviewerSessionId,
        descriptionSessionSnapshot,
      }),
    [
      descriptionSessionSnapshot,
      params.sessions,
      params.workspacePath,
      reviewerSessionId,
    ]
  );

  return { forcedHiddenSessionIds, reviewerSessionId };
};
