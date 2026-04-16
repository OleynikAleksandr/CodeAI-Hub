import { type MutableRefObject, useEffect, useRef } from "react";
import { isEmptyWorkflowState } from "../../services/workflow-state-helpers";
import { useWorkflowStateSnapshot, workflowStateStore } from "../../services/workflow-state-store";
import type { WorkspaceProject } from "../../types";
import { resolveWorkspaceSlug } from "./main-area-utils";
import {
  WORKFLOW_STAGE_ORDER,
  type WorkflowStageId,
  type WorkflowStateSnapshot,
} from "../../services/workflow-state-client";
import type { DescriptionSessionGuard } from "./use-description-session-guard";
import { resolveToolByStage } from "./main-area-utils";
const DESCRIPTION_TOOL = "Description";

type DescriptionDocument = {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
  readonly label: "Final_Description.md";
};

type QuestionnaireDocument = {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
  readonly label: "questionnaire.md";
};

type UseMainAreaWorkflowStateParams = {
  readonly activeWorkspace?: WorkspaceProject;
  readonly activeTool?: string | null;
  readonly setActiveTool: (value: string) => void;
  readonly setDescriptionDocument: (value: DescriptionDocument | null) => void;
  readonly setQuestionnaireDocument: (value: QuestionnaireDocument | null) => void;
  readonly setHasDescriptionSession: (value: boolean) => void;
  readonly descriptionGuardRef: MutableRefObject<DescriptionSessionGuard>;
};

const resolveStartupTool = (state: WorkflowStateSnapshot | null): string => {
  if (!state) return DESCRIPTION_TOOL;
  for (let i = WORKFLOW_STAGE_ORDER.length - 1; i >= 0; i--) {
    const stage = WORKFLOW_STAGE_ORDER[i]!;
    if (state.stages[stage] !== "idle") {
      return resolveToolByStage(stage) ?? DESCRIPTION_TOOL;
    }
  }
  return DESCRIPTION_TOOL;
};

const isCanonicalDescriptionPath = (path: string): boolean =>
  /\/description\/Final_Description\.md$/.test(path);

const isCurrentWorkspaceSnapshot = (params: {
  readonly activeWorkspace?: WorkspaceProject;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): boolean => {
  if (!params.activeWorkspace?.path) {
    return false;
  }
  const activeWorkspaceSlug = resolveWorkspaceSlug(params.activeWorkspace);
  if (!activeWorkspaceSlug) {
    return false;
  }
  return (
    params.workspaceSlug === activeWorkspaceSlug &&
    params.workspacePath === params.activeWorkspace.path
  );
};

export const useMainAreaWorkflowState = (
  params: UseMainAreaWorkflowStateParams
): void => {
  const autoOpenedWorkspaceRef = useRef<string | null>(null);
  const autoResolvedActiveToolRef = useRef<string | null>(null);
  const storeState = useWorkflowStateSnapshot();

  // Activate/deactivate the shared store when workspace changes
  useEffect(() => {
    if (!params.activeWorkspace?.path) {
      workflowStateStore.deactivate();
      params.setDescriptionDocument(null);
      params.setQuestionnaireDocument(null);
      params.setHasDescriptionSession(false);
      autoOpenedWorkspaceRef.current = null;
      autoResolvedActiveToolRef.current = null;
      return;
    }
    const slug = resolveWorkspaceSlug(params.activeWorkspace);
    if (!slug) {
      workflowStateStore.deactivate();
      params.setDescriptionDocument(null);
      params.setQuestionnaireDocument(null);
      params.setHasDescriptionSession(false);
      autoOpenedWorkspaceRef.current = null;
      autoResolvedActiveToolRef.current = null;
      return;
    }
    autoResolvedActiveToolRef.current = null;
    workflowStateStore.activate(slug, params.activeWorkspace.path);
  }, [params.activeWorkspace?.id, params.activeWorkspace?.path, params.activeWorkspace?.slug, params.activeWorkspace?.name, params.setDescriptionDocument, params.setHasDescriptionSession, params.setQuestionnaireDocument]);

  // Derive UI state from the shared store snapshot.
  // Skip until the store has completed its first poll — prevents
  // null-snapshot derivation from resetting hasDescriptionSession
  // and unmounting ProjectManagerSessionView.
  useEffect(() => {
    const { snapshot: state, workspaceSlug, workspacePath, loaded } = storeState;
    if (!workspaceSlug || !workspacePath || !loaded) return;
    if (
      !isCurrentWorkspaceSnapshot({
        activeWorkspace: params.activeWorkspace,
        workspacePath,
        workspaceSlug,
      })
    ) {
      return;
    }
    const branch = state?.description;
    const resolvedActiveTool = resolveStartupTool(state);
    if (state && autoResolvedActiveToolRef.current !== workspaceSlug) {
      autoResolvedActiveToolRef.current = workspaceSlug;
      params.setActiveTool(resolvedActiveTool);
    }
    const nextDescription =
      branch?.finalPath && branch.finalPath.trim().length > 0
        ? { path: branch.finalPath, label: "Final_Description.md" as const }
        : branch?.draftPath && branch.draftPath.trim().length > 0 && isCanonicalDescriptionPath(branch.draftPath)
          ? { path: branch.draftPath, label: "Final_Description.md" as const }
          : null;
    params.setDescriptionDocument(
      nextDescription ? { ...nextDescription, workspacePath, workspaceSlug } : null
    );
    const nextHasDescriptionSession = Boolean(branch?.primarySession?.providerSessionId);
    if (!nextHasDescriptionSession && params.descriptionGuardRef.current.active) {
      // Guard active — skip downgrade
    } else {
      params.setHasDescriptionSession(nextHasDescriptionSession);
    }
    const questionnairePath =
      branch?.questionnairePath && branch.questionnairePath.trim().length > 0
        ? branch.questionnairePath
        : `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;
    const nextQuestionnaire =
      !nextDescription
        ? { path: questionnairePath, label: "questionnaire.md" as const }
        : null;
    params.setQuestionnaireDocument(
      nextQuestionnaire ? { ...nextQuestionnaire, workspacePath, workspaceSlug } : null
    );
    if (isEmptyWorkflowState(state) && autoOpenedWorkspaceRef.current !== workspaceSlug) {
      autoOpenedWorkspaceRef.current = workspaceSlug;
      params.setActiveTool(DESCRIPTION_TOOL);
    }
  }, [storeState, params.activeWorkspace, params.setActiveTool, params.setDescriptionDocument, params.setHasDescriptionSession, params.setQuestionnaireDocument, params.descriptionGuardRef]);
};
