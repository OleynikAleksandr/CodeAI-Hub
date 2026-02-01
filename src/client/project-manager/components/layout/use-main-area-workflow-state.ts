import { useEffect, useRef } from "react";
import { api } from "../../api";
import { isEmptyWorkflowState } from "../../services/workflow-state-helpers";
import type { WorkspaceProject } from "../../types";
import { resolveWorkspaceSlug } from "./main-area-utils";

type DescriptionDocument = {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
  readonly label: "description.md" | "Final_Description.md";
};

type QuestionnaireDocument = {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
  readonly label: "questionnaire.md";
};

type UseMainAreaWorkflowStateParams = {
  readonly activeWorkspace?: WorkspaceProject;
  readonly setActiveTool: (value: string) => void;
  readonly setDescriptionDocument: (value: DescriptionDocument | null) => void;
  readonly setQuestionnaireDocument: (value: QuestionnaireDocument | null) => void;
  readonly setHasDescriptionSession: (value: boolean) => void;
};

export const useMainAreaWorkflowState = (
  params: UseMainAreaWorkflowStateParams
): void => {
  const autoOpenedWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!params.activeWorkspace?.path) {
      params.setDescriptionDocument(null);
      params.setQuestionnaireDocument(null);
      params.setHasDescriptionSession(false);
      autoOpenedWorkspaceRef.current = null;
      return;
    }

    const workspaceSlug = resolveWorkspaceSlug(params.activeWorkspace);
    if (!workspaceSlug) {
      params.setDescriptionDocument(null);
      params.setQuestionnaireDocument(null);
      params.setHasDescriptionSession(false);
      autoOpenedWorkspaceRef.current = null;
      return;
    }

    const workspacePath = params.activeWorkspace.path;
    let cancelled = false;
    let timer = 0;
    let fastPolling = true;

    const loadState = async () => {
      const state = await api.getWorkflowState(workspaceSlug, workspacePath);
      if (cancelled) {
        return;
      }
      if (state && fastPolling) {
        fastPolling = false;
        window.clearInterval(timer);
        timer = window.setInterval(loadState, 10_000);
      }

      const branch = state?.description;
      const nextDescription =
        branch?.finalPath && branch.finalPath.trim().length > 0
          ? { path: branch.finalPath, label: "Final_Description.md" as const }
          : branch?.draftPath && branch.draftPath.trim().length > 0
            ? { path: branch.draftPath, label: "description.md" as const }
            : null;

      params.setDescriptionDocument(
        nextDescription ? { ...nextDescription, workspacePath, workspaceSlug } : null
      );

      const nextHasDescriptionSession = Boolean(
        branch?.session?.providerSessionId || branch?.sessionKind
      );
      params.setHasDescriptionSession(nextHasDescriptionSession);

      const questionnairePath =
        branch?.questionnairePath && branch.questionnairePath.trim().length > 0
          ? branch.questionnairePath
          : `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;

      const nextQuestionnaire =
        nextHasDescriptionSession && !nextDescription
          ? { path: questionnairePath, label: "questionnaire.md" as const }
          : null;

      params.setQuestionnaireDocument(
        nextQuestionnaire
          ? { ...nextQuestionnaire, workspacePath, workspaceSlug }
          : null
      );

      if (
        isEmptyWorkflowState(state) &&
        autoOpenedWorkspaceRef.current !== workspaceSlug
      ) {
        autoOpenedWorkspaceRef.current = workspaceSlug;
        params.setActiveTool("Description");
      }
    };

    loadState();
    timer = window.setInterval(loadState, 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    params.activeWorkspace?.id,
    params.activeWorkspace?.path,
    params.activeWorkspace?.slug,
    params.activeWorkspace?.name,
    params.setActiveTool,
    params.setDescriptionDocument,
    params.setHasDescriptionSession,
    params.setQuestionnaireDocument,
  ]);
};

