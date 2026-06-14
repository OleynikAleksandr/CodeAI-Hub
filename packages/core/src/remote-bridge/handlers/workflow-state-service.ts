import path from "node:path";
import type { Request, Response } from "express";
import { ManagedWorkflowReadModelProjector } from "../../managed-workflow-orchestration/managed-workflow-read-model-projector";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import {
  buildDescriptionBranchSnapshot,
  DescriptionStepStore,
} from "../../workflow/description/description-step-store";
import { WorkflowLastActiveStore } from "../../workflow/state/workflow-last-active-store";
import { WorkflowStateFacade } from "../../workflow/state/workflow-state-facade";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import { applyVirtualSimulationValidation } from "../../workflow/validation/virtual-simulation-validator";
import type { WorkflowWatcherEvent } from "../../workflow/watcher/watcher-types";
import type { TechnicalStageRewriteBoundaryPayload } from "../types";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { readApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { readDevelopmentTreeSnapshot } from "./development-tree-snapshot";
import { readDiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import { readManagedDocumentationReviewOpenStages } from "./managed-review-state-readers";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import {
  applyTechnicalRootProgressToState,
  readQualityGatesProgressSnapshot,
  resolveWorkflowBlockedStages,
} from "./quality-gates-progress";
import {
  attachTechnicalStageDirtyFiles,
  attachValidationDirtyGate,
  readTechnicalStageDirtyStatus,
} from "./technical-stage-dirty-gate";
import {
  normalizeClearedWorkflowProjection,
  workflowArtifactFileExists,
} from "./workflow-state-cleared-projection";
import { hydrateWorkflowStateFromContinuity } from "./workflow-state-continuity-hydration";
import { applyDevelopmentTreeFreshnessToState } from "./workflow-state-development-tree-freshness";
import { hydrateDiagramModulesStateFromProgress } from "./workflow-state-diagram-modules-hydration";
import { hydrateWorkflowStateFromFilesystem } from "./workflow-state-filesystem-hydration";
import { resolveCanonicalLastActive } from "./workflow-state-last-active-resolver";
import { hydrateTechnicalStageCompletionFromManagedWorkspace } from "./workflow-state-managed-stage-hydration";
import { resolveWorkflowUserInputAttentionCursor } from "./workflow-user-input-attention";
import { buildWorkflowUserInputDocumentationStages } from "./workflow-user-input-attention-stages";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
const readAbsolutePath = (value: unknown): string | null => {
  const trimmed = readNonEmptyString(value);
  return trimmed && path.isAbsolute(trimmed) ? trimmed : null;
};
const isTechnicalStageRewriteBoundaryActive = (state: WorkflowState): boolean =>
  state.stages.diagram_modules.status !== "idle" ||
  state.stages.application_skeleton.status !== "idle" ||
  state.stages.quality_gates.status !== "idle";
type WorkspaceSlugResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly status: number; readonly error: string };
const resolveTechnicalStageRewriteBoundary = (params: {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
  readonly state: WorkflowState;
}): TechnicalStageRewriteBoundaryPayload => {
  const active = isTechnicalStageRewriteBoundaryActive(params.state);
  const blockers = [
    ...(params.applicationSkeletonProgress?.validationErrors ?? []),
    ...(params.qualityGatesProgress?.validationErrors ?? []),
    ...(params.qualityGatesProgress?.substep === "failed"
      ? ["Quality Gates integration failed"]
      : []),
  ];
  return {
    active,
    blockers,
    readOnlyStages: active ? ["description", "virtual_simulation"] : [],
  };
};
export class WorkflowStateService {
  private readonly logger: Logger;
  private readonly sessionManager?: SessionManager;
  private readonly stores = new Map<string, WorkflowStateFacade>();
  private readonly descriptionStepStore = new DescriptionStepStore();
  private readonly lastActiveStore = new WorkflowLastActiveStore();
  private readonly managedWorkflowReadModel =
    new ManagedWorkflowReadModelProjector();

  constructor(options: {
    readonly logger: Logger;
    readonly sessionManager?: SessionManager;
  }) {
    this.logger = options.logger;
    this.sessionManager = options.sessionManager;
  }

  record(event: WorkflowWatcherEvent): WorkflowState {
    const store = this.getStore(event.workspaceSlug);
    return store.apply(event);
  }

  resetWorkspaceState(workspaceSlug: string): void {
    this.stores.delete(workspaceSlug);
  }

  handleWorkflowStateRead(req: Request, res: Response): void {
    const workspaceSlugResult = this.resolveWorkspaceSlug(req);
    if (!workspaceSlugResult.ok) {
      res
        .status(workspaceSlugResult.status)
        .json({ error: workspaceSlugResult.error });
      return;
    }

    const state = this.getStore(workspaceSlugResult.value).snapshot();
    const workspaceRoot = this.resolveWorkspaceRoot(
      req,
      workspaceSlugResult.value
    );

    if (!workspaceRoot) {
      res.json({
        state,
        continuity: { chains: [] },
        description: null,
        lastActive: null,
        diagramModulesProgress: null,
        userGateCursor: null,
        managedWorkflowPreview: null,
      });
      return;
    }

    const continuityPromise = SessionContinuityFacade.readWorkspaceChains({
      workspaceRoot,
      workspaceSlug: workspaceSlugResult.value,
    });
    const descriptionPromise = this.descriptionStepStore.read(
      workspaceRoot,
      workspaceSlugResult.value
    );
    const lastActivePromise = this.lastActiveStore.read(
      workspaceRoot,
      workspaceSlugResult.value
    );
    const diagramModulesProgressPromise = readDiagramModulesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: workspaceSlugResult.value,
    });
    const applicationSkeletonProgressPromise =
      readApplicationSkeletonProgressSnapshot({
        workspaceRoot,
        workspaceSlug: workspaceSlugResult.value,
      });
    const qualityGatesProgressPromise = readQualityGatesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: workspaceSlugResult.value,
    });
    const managedReviewOpenPromise =
      readManagedDocumentationReviewOpenStages(workspaceRoot);
    const technicalStageDirtyStatusPromise = readTechnicalStageDirtyStatus(
      workspaceRoot,
      workspaceSlugResult.value
    );
    const virtualSimulationArtifactExistsPromise = workflowArtifactFileExists({
      workspaceRoot,
      workspaceSlug: workspaceSlugResult.value,
      stage: "virtual_simulation",
      fileName: "virtual-simulation.md",
    });
    Promise.all([
      continuityPromise,
      descriptionPromise,
      lastActivePromise,
      diagramModulesProgressPromise,
      applicationSkeletonProgressPromise,
      qualityGatesProgressPromise,
      managedReviewOpenPromise,
      technicalStageDirtyStatusPromise,
      virtualSimulationArtifactExistsPromise,
    ])
      .then(
        ([
          chains,
          descriptionSnapshot,
          lastActive,
          rawDiagramModulesProgress,
          rawApplicationSkeletonProgress,
          rawQualityGatesProgress,
          managedReviewOpen,
          technicalStageDirtyStatus,
          virtualSimulationArtifactExists,
        ]) => {
          const description = descriptionSnapshot
            ? buildDescriptionBranchSnapshot(descriptionSnapshot)
            : null;
          const technicalStageProgress = {
            applicationSkeletonProgress: attachValidationDirtyGate(
              rawApplicationSkeletonProgress,
              "Application Skeleton",
              technicalStageDirtyStatus.dirtyByStage.application_skeleton
            ),
            diagramModulesProgress: attachTechnicalStageDirtyFiles(
              rawDiagramModulesProgress,
              technicalStageDirtyStatus.dirtyByStage.diagram_modules
            ),
            technicalStageDirtyStatus,
            qualityGatesProgress: attachValidationDirtyGate(
              rawQualityGatesProgress,
              "Quality Gates",
              technicalStageDirtyStatus.dirtyByStage.quality_gates
            ),
          };
          return hydrateWorkflowStateFromFilesystem({
            state,
            workspaceRoot,
            workspaceSlug: workspaceSlugResult.value,
          })
            .then((hydratedState) =>
              applyVirtualSimulationValidation({
                state: hydratedState,
                workspaceRoot,
                workspaceSlug: workspaceSlugResult.value,
              })
            )
            .then((validatedState) =>
              hydrateDiagramModulesStateFromProgress({
                state: validatedState,
                workspaceRoot,
                workspaceSlug: workspaceSlugResult.value,
                diagramModulesProgress:
                  technicalStageProgress.diagramModulesProgress,
              })
            )
            .then((validatedState) =>
              hydrateWorkflowStateFromContinuity({
                chains,
                state: validatedState,
              })
            )
            .then((validatedState) =>
              applyTechnicalRootProgressToState({
                state: validatedState,
                applicationSkeletonProgress:
                  technicalStageProgress.applicationSkeletonProgress,
                qualityGatesProgress:
                  technicalStageProgress.qualityGatesProgress,
              })
            )
            .then((validatedState) =>
              normalizeClearedWorkflowProjection({
                state: validatedState,
                chains,
                description,
                diagramModulesProgress:
                  technicalStageProgress.diagramModulesProgress,
                applicationSkeletonProgress:
                  technicalStageProgress.applicationSkeletonProgress,
                qualityGatesProgress:
                  technicalStageProgress.qualityGatesProgress,
                sessionManager: this.sessionManager,
                virtualSimulationArtifactExists,
                workspaceRoot,
                workspaceSlug: workspaceSlugResult.value,
              })
            )
            .then((validatedState) =>
              hydrateTechnicalStageCompletionFromManagedWorkspace({
                state: validatedState,
                workspaceRoot,
              })
            )
            .then((validatedState) =>
              readDevelopmentTreeSnapshot({
                workspaceRoot,
                workspaceSlug: workspaceSlugResult.value,
                plannedPartIds:
                  technicalStageProgress.diagramModulesProgress
                    ?.plannedPartIds ?? [],
                generatedPartIds:
                  technicalStageProgress.diagramModulesProgress
                    ?.generatedPartIds ?? [],
                leadProductPartId:
                  technicalStageProgress.diagramModulesProgress
                    ?.leadProductPartId ?? null,
                productPartLeadershipOrder:
                  technicalStageProgress.diagramModulesProgress
                    ?.productPartLeadershipOrder ?? [],
              }).then((developmentTree) => {
                return applyDevelopmentTreeFreshnessToState({
                  developmentTree,
                  state: validatedState,
                  workspaceRoot,
                }).then((responseState) => {
                  const canonicalLastActive = resolveCanonicalLastActive({
                    chains,
                    description,
                    lastActive,
                    state: responseState,
                    workspaceSlug: workspaceSlugResult.value,
                  });
                  const gating = {
                    blocked: resolveWorkflowBlockedStages({
                      state: responseState,
                      description,
                      diagramModulesProgress:
                        technicalStageProgress.diagramModulesProgress,
                      applicationSkeletonProgress:
                        technicalStageProgress.applicationSkeletonProgress,
                      technicalStageGitClean:
                        technicalStageProgress.technicalStageDirtyStatus.clean,
                    }),
                    dirtyFiles:
                      technicalStageProgress.technicalStageDirtyStatus
                        .dirtyFiles,
                  };
                  const technicalStageRewriteBoundary =
                    resolveTechnicalStageRewriteBoundary({
                      state: responseState,
                      applicationSkeletonProgress:
                        technicalStageProgress.applicationSkeletonProgress,
                      qualityGatesProgress:
                        technicalStageProgress.qualityGatesProgress,
                    });
                  res.json({
                    state: responseState,
                    continuity: { chains },
                    description,
                    lastActive: canonicalLastActive,
                    gating,
                    diagramModulesProgress:
                      technicalStageProgress.diagramModulesProgress,
                    applicationSkeletonProgress:
                      technicalStageProgress.applicationSkeletonProgress,
                    qualityGatesProgress:
                      technicalStageProgress.qualityGatesProgress,
                    developmentTree,
                    userGateCursor: resolveWorkflowUserInputAttentionCursor({
                      developmentTree,
                      documentationStages:
                        buildWorkflowUserInputDocumentationStages({
                          applicationSkeletonProgress:
                            technicalStageProgress.applicationSkeletonProgress,
                          managedReviewOpen,
                          qualityGatesProgress:
                            technicalStageProgress.qualityGatesProgress,
                          sessionManager: this.sessionManager,
                          workspaceRoot,
                          workspaceSlug: workspaceSlugResult.value,
                        }),
                      workspaceSlug: workspaceSlugResult.value,
                    }),
                    technicalStageRewriteBoundary,
                    managedWorkflowPreview:
                      this.managedWorkflowReadModel.project({
                        readOnlyStages:
                          technicalStageRewriteBoundary.readOnlyStages,
                      }),
                  });
                });
              })
            );
        }
      )
      .catch((error) => {
        this.logger.warn("Failed to read workflow metadata", {
          workspaceSlug: workspaceSlugResult.value,
          error: error instanceof Error ? error.message : String(error),
        });
        res.json({
          state,
          continuity: { chains: [] },
          description: null,
          lastActive: null,
          diagramModulesProgress: null,
          userGateCursor: null,
          managedWorkflowPreview: null,
        });
      });
  }

  private resolveWorkspaceSlug(req: Request): WorkspaceSlugResult {
    const query = req.query as Record<string, unknown>;
    const workspaceSlug = readNonEmptyString(query.workspaceSlug);
    if (workspaceSlug) {
      return { ok: true, value: workspaceSlug };
    }

    const sessionId = readNonEmptyString(query.sessionId);
    if (!sessionId) {
      return {
        ok: false,
        status: HTTP_BAD_REQUEST,
        error: "Missing workspaceSlug or sessionId",
      };
    }
    if (!this.sessionManager) {
      return {
        ok: false,
        status: HTTP_BAD_REQUEST,
        error: "Session lookup unavailable",
      };
    }
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return {
        ok: false,
        status: HTTP_NOT_FOUND,
        error: `Session ${sessionId} not found`,
      };
    }
    if (!session.initiativeSlug) {
      return {
        ok: false,
        status: HTTP_BAD_REQUEST,
        error: "Session missing workspace slug",
      };
    }
    return { ok: true, value: session.initiativeSlug };
  }

  private getStore(workspaceSlug: string): WorkflowStateFacade {
    const existing = this.stores.get(workspaceSlug);
    if (existing) {
      return existing;
    }
    this.logger.debug("Creating workflow state store", { workspaceSlug });
    const store = new WorkflowStateFacade({ workspaceSlug });
    this.stores.set(workspaceSlug, store);
    return store;
  }

  private resolveWorkspaceRoot(
    req: Request,
    workspaceSlug: string
  ): string | null {
    const query = req.query as Record<string, unknown>;
    const workspacePath = readAbsolutePath(query.workspacePath);
    if (workspacePath) {
      return workspacePath;
    }

    if (!this.sessionManager) {
      return null;
    }
    const sessionId = readNonEmptyString(query.sessionId);
    if (sessionId) {
      const session = this.sessionManager.getSession(sessionId);
      if (session?.workspacePath) {
        return session.workspacePath;
      }
    }

    const session = this.sessionManager
      .listSessions()
      .find((candidate) => candidate.initiativeSlug === workspaceSlug);
    return session?.workspacePath ?? null;
  }
}
