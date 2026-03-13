import { useEffect, useRef } from "react";
import { api } from "../../api";
import { isEmptyWorkflowState } from "../../services/workflow-state-helpers";
import type { WorkspaceProject } from "../../types";
import { resolveWorkspaceSlug } from "./main-area-utils";
import { VIRTUAL_SIMULATION_TOOL_LABEL } from "./use-workflow-tool-select";
import type { WorkflowStageId, WorkflowStateSnapshot } from "../../services/workflow-state-client";

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
  readonly activeTool?: string | null;
  readonly setActiveTool: (value: string) => void;
  readonly setDescriptionDocument: (value: DescriptionDocument | null) => void;
  readonly setQuestionnaireDocument: (value: QuestionnaireDocument | null) => void;
  readonly setHasDescriptionSession: (value: boolean) => void;
};

const TOOL_BY_STAGE: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: VIRTUAL_SIMULATION_TOOL_LABEL,
  diagram_modules: "Diagram Modules",
  diagram_facades: "Diagram Facades",
};

const STAGE_PRIORITY: readonly WorkflowStageId[] = [
  "diagram_facades",
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

export const useMainAreaWorkflowState = (
  params: UseMainAreaWorkflowStateParams
): void => {
  const autoOpenedWorkspaceRef = useRef<string | null>(null);
  const autoResolvedActiveToolRef = useRef<string | null>(null);
  const activeToolRef = useRef<string | null>(params.activeTool ?? null);

  useEffect(() => {
    activeToolRef.current = params.activeTool ?? null;
  }, [params.activeTool]);

  useEffect(() => {
    if (!params.activeWorkspace?.path) {
      params.setDescriptionDocument(null);
      params.setQuestionnaireDocument(null);
      params.setHasDescriptionSession(false);
      autoOpenedWorkspaceRef.current = null;
      autoResolvedActiveToolRef.current = null;
      return;
    }

    const workspaceSlug = resolveWorkspaceSlug(params.activeWorkspace);
    if (!workspaceSlug) {
      params.setDescriptionDocument(null);
      params.setQuestionnaireDocument(null);
      params.setHasDescriptionSession(false);
      autoOpenedWorkspaceRef.current = null;
      autoResolvedActiveToolRef.current = null;
      return;
    }

    const workspacePath = params.activeWorkspace.path;
    let cancelled = false;
    let timer = 0;
    let fastPolling = true;
    autoResolvedActiveToolRef.current = null;

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
      const resolvedActiveTool = resolveLastActiveTool(state);
      if (state && autoResolvedActiveToolRef.current !== workspaceSlug) {
        autoResolvedActiveToolRef.current = workspaceSlug;
        params.setActiveTool(resolvedActiveTool);
      }
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
