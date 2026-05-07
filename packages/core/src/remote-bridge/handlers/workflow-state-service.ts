import path from "node:path";
import type { Request, Response } from "express";
import { readDevelopmentTreeBootstrapGate } from "../../development-tree/development-tree-bootstrap-gate";
import { DevelopmentTreeStateFacade } from "../../development-tree/development-tree-state-facade";
import { DevelopmentTreeFilesystemStructuratorFacade } from "../../development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade";
import { DevelopmentTreeNodeBootstrapFacade } from "../../development-tree/node-bootstrap/development-tree-node-bootstrap-facade";
import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
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
import type { ManagedWorkflowLifecyclePayload } from "../types";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { readApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { readDiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import {
  applyTechnicalRootProgressToState,
  readQualityGatesProgressSnapshot,
  resolveWorkflowBlockedStages,
} from "./quality-gates-progress";
import { applyDevelopmentTreeFreshnessToState } from "./workflow-state-development-tree-freshness";
import { hydrateDiagramModulesStateFromProgress } from "./workflow-state-diagram-modules-hydration";
import { hydrateWorkflowStateFromFilesystem } from "./workflow-state-filesystem-hydration";
import { resolveCanonicalLastActive } from "./workflow-state-last-active-resolver";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
const readAbsolutePath = (value: unknown): string | null => {
  const trimmed = readNonEmptyString(value);
  if (!trimmed) {
    return null;
  }
  return path.isAbsolute(trimmed) ? trimmed : null;
};
type WorkspaceSlugResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly status: number; readonly error: string };
interface DevelopmentTreeAgentSessionOptions {
  readonly gateway: DevelopmentTreeAgentSessionGateway;
  readonly providerId: string;
  readonly technologyBase?: string;
}
const resolveLatestDiagramModulesProviderId = (
  chains: readonly ContinuityChainSummary[]
): string | null => {
  let best: { readonly providerId: string; readonly updatedAt: string } | null =
    null;
  for (const chain of chains) {
    if (chain.stage !== "diagram_modules") {
      continue;
    }
    const providerId = chain.segments.at(-1)?.providerId;
    if (!providerId) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = { providerId, updatedAt: chain.updatedAt };
    }
  }
  return best?.providerId ?? null;
};
const resolveManagedLifecycle = (params: {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
  readonly state: WorkflowState;
}): ManagedWorkflowLifecyclePayload => {
  const active = params.state.stages.diagram_modules.status !== "idle";
  const blockers = [
    ...(params.applicationSkeletonProgress?.validationErrors ?? []),
    ...(params.qualityGatesProgress?.substep === "failed"
      ? ["Quality Gates integration failed"]
      : []),
  ];
  return {
    active,
    blockers,
    controlPlanePath: ".codeai-hub/workflow",
    readOnlyStages: active ? ["description", "virtual_simulation"] : [],
    revisionRootPath: ".codeai-hub/workflow/revisions",
    todoPlanPath: "doc/TODO/workspace.plan.md",
  };
};
export class WorkflowStateService {
  private readonly developmentTreeAgentSessions?: DevelopmentTreeAgentSessionOptions;
  private readonly logger: Logger;
  private readonly nodeBootstraps = new Map<
    string,
    DevelopmentTreeNodeBootstrapFacade
  >();
  private readonly sessionManager?: SessionManager;
  private readonly stores = new Map<string, WorkflowStateFacade>();
  private readonly descriptionStepStore = new DescriptionStepStore();
  private readonly developmentTreeState = new DevelopmentTreeStateFacade();
  private readonly filesystemStructurator =
    new DevelopmentTreeFilesystemStructuratorFacade();
  private readonly lastActiveStore = new WorkflowLastActiveStore();

  constructor(options: {
    readonly developmentTreeAgentSessions?: DevelopmentTreeAgentSessionOptions;
    readonly logger: Logger;
    readonly sessionManager?: SessionManager;
  }) {
    this.developmentTreeAgentSessions = options.developmentTreeAgentSessions;
    this.logger = options.logger;
    this.sessionManager = options.sessionManager;
    this.developmentTreeState.subscribeSnapshot(
      async ({ snapshot, workspaceRoot, workspaceSlug }) => {
        try {
          if (
            !(
              await readDevelopmentTreeBootstrapGate({
                workspaceRoot,
                workspaceSlug,
              })
            ).unlocked
          ) {
            return;
          }
          await this.filesystemStructurator.materialize({
            snapshot,
            workspaceRoot,
            workspaceSlug,
          });
          await this.getNodeBootstrap({
            workspaceRoot,
            workspaceSlug,
          }).consumeNewNodes({ workspaceRoot, workspaceSlug });
        } catch (error) {
          this.logger.warn(
            "Failed to materialize development tree filesystem or node drafts",
            {
              workspaceSlug,
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }
      }
    );
  }

  record(event: WorkflowWatcherEvent): WorkflowState {
    const store = this.getStore(event.workspaceSlug);
    return store.apply(event);
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

    Promise.all([
      continuityPromise,
      descriptionPromise,
      lastActivePromise,
      diagramModulesProgressPromise,
      applicationSkeletonProgressPromise,
      qualityGatesProgressPromise,
    ])
      .then(
        ([
          chains,
          descriptionSnapshot,
          lastActive,
          diagramModulesProgress,
          applicationSkeletonProgress,
          qualityGatesProgress,
        ]) => {
          const description = descriptionSnapshot
            ? buildDescriptionBranchSnapshot(descriptionSnapshot)
            : null;
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
                diagramModulesProgress,
              })
            )
            .then((validatedState) =>
              applyTechnicalRootProgressToState({
                state: validatedState,
                applicationSkeletonProgress,
                qualityGatesProgress,
              })
            )
            .then((validatedState) =>
              this.developmentTreeState
                .currentSnapshot({
                  workspaceRoot,
                  workspaceSlug: workspaceSlugResult.value,
                  plannedPartIds: diagramModulesProgress?.plannedPartIds ?? [],
                  generatedPartIds:
                    diagramModulesProgress?.generatedPartIds ?? [],
                })
                .then((developmentTree) => {
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
                        diagramModulesProgress,
                        applicationSkeletonProgress,
                      }),
                    };
                    res.json({
                      state: responseState,
                      continuity: { chains },
                      description,
                      lastActive: canonicalLastActive,
                      gating,
                      diagramModulesProgress,
                      applicationSkeletonProgress,
                      qualityGatesProgress,
                      developmentTree,
                      managedLifecycle: resolveManagedLifecycle({
                        state: responseState,
                        applicationSkeletonProgress,
                        qualityGatesProgress,
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

  private getNodeBootstrap(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): DevelopmentTreeNodeBootstrapFacade {
    const key = `${params.workspaceRoot}\0${params.workspaceSlug}`;
    const existing = this.nodeBootstraps.get(key);
    if (existing) {
      return existing;
    }
    const bootstrap = new DevelopmentTreeNodeBootstrapFacade({
      ...(this.developmentTreeAgentSessions
        ? {
            agentSessionOptions: {
              ...this.developmentTreeAgentSessions,
              providerId: () =>
                this.resolveDevelopmentTreeAgentProviderId(params),
              workspacePath: params.workspaceRoot,
              workspaceSlug: params.workspaceSlug,
            },
          }
        : {}),
    });
    this.nodeBootstraps.set(key, bootstrap);
    return bootstrap;
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

  private async resolveDevelopmentTreeAgentProviderId(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<string> {
    const fallbackProviderId = this.developmentTreeAgentSessions?.providerId;
    if (!fallbackProviderId) {
      return "";
    }
    const chains = await SessionContinuityFacade.readWorkspaceChains({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    return resolveLatestDiagramModulesProviderId(chains) ?? fallbackProviderId;
  }
}
