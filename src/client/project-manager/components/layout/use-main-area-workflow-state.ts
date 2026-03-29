import { type MutableRefObject, useEffect, useRef } from "react";
import { isEmptyWorkflowState } from "../../services/workflow-state-helpers";
import { useWorkflowStateSnapshot, workflowStateStore } from "../../services/workflow-state-store";
import type { WorkspaceProject } from "../../types";
import { resolveWorkspaceSlug } from "./main-area-utils";
import { VIRTUAL_SIMULATION_TOOL_LABEL } from "./use-workflow-tool-select";
import type { WorkflowStageId, WorkflowStateSnapshot } from "../../services/workflow-state-client";
import type { DescriptionSessionGuard } from "./use-description-session-guard";

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

const TOOL_BY_STAGE: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: VIRTUAL_SIMULATION_TOOL_LABEL,
  diagram_modules: "Diagram Modules",
};

const STAGE_PRIORITY: readonly WorkflowStageId[] = [
  "diagram_modules",
  "virtual_simulation",
  "description",
];

const hasContinuitySegmentsForStage = (
  state: WorkflowStateSnapshot,
  stage: WorkflowStageId
): boolean =>
  state.continuity.chains.some(
    (chain) => chain.stage === stage && chain.segments.length > 0
  );

const resolveLastActiveTool = (state: WorkflowStateSnapshot | null): string => {
  if (!state) {
    return TOOL_BY_STAGE.description;
  }

  for (const stage of STAGE_PRIORITY) {
    if (
      stage === "description" ||
      state.stages[stage] !== "idle" ||
      hasContinuitySegmentsForStage(state, stage)
    ) {
      return TOOL_BY_STAGE[stage];
    }
  }

  return TOOL_BY_STAGE.description;
};

const isCanonicalDescriptionPath = (path: string): boolean =>
  /\/description\/Final_Description\.md$/.test(path);

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

  // Derive UI state from the shared store snapshot
  useEffect(() => {
    const { snapshot: state, workspaceSlug, workspacePath } = storeState;
    if (!workspaceSlug || !workspacePath) return;
    const branch = state?.description;
    const resolvedActiveTool = resolveLastActiveTool(state);
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
      nextHasDescriptionSession && !nextDescription
        ? { path: questionnairePath, label: "questionnaire.md" as const }
        : null;
    params.setQuestionnaireDocument(
      nextQuestionnaire ? { ...nextQuestionnaire, workspacePath, workspaceSlug } : null
    );
    if (isEmptyWorkflowState(state) && autoOpenedWorkspaceRef.current !== workspaceSlug) {
      autoOpenedWorkspaceRef.current = workspaceSlug;
      params.setActiveTool("Description");
    }
  }, [storeState, params.setActiveTool, params.setDescriptionDocument, params.setHasDescriptionSession, params.setQuestionnaireDocument, params.descriptionGuardRef]);
};
