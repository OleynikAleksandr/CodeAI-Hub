import path from "node:path";
import type { Request, Response } from "express";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import {
  buildDescriptionBranchSnapshot,
  DescriptionStepStore,
} from "../../workflow/description/description-step-store";
import { WorkspaceExecutionProfileFacade } from "../../workflow/execution-profile/workspace-execution-profile-facade";
import { WorkflowLastActiveStore } from "../../workflow/state/workflow-last-active-store";
import { WorkflowStateFacade } from "../../workflow/state/workflow-state-facade";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import { applyVirtualSimulationValidation } from "../../workflow/validation/virtual-simulation-validator";
import type {
  WorkflowStageId,
  WorkflowWatcherEvent,
} from "../../workflow/watcher/watcher-types";

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

export class WorkflowStateService {
  private readonly logger: Logger;
  private readonly sessionManager?: SessionManager;
  private readonly stores = new Map<string, WorkflowStateFacade>();
  private readonly descriptionStepStore = new DescriptionStepStore();
  private readonly executionProfileFacade =
    new WorkspaceExecutionProfileFacade();
  private readonly lastActiveStore = new WorkflowLastActiveStore();

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
        executionProfile: null,
        lastActive: null,
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
    const executionProfilePromise = this.executionProfileFacade.read(
      workspaceRoot,
      workspaceSlugResult.value
    );
    const lastActivePromise = this.lastActiveStore.read(
      workspaceRoot,
      workspaceSlugResult.value
    );

    Promise.all([
      continuityPromise,
      descriptionPromise,
      executionProfilePromise,
      lastActivePromise,
    ])
      .then(([chains, descriptionSnapshot, executionProfile, lastActive]) => {
        const description = descriptionSnapshot
          ? buildDescriptionBranchSnapshot(descriptionSnapshot)
          : null;
        return applyVirtualSimulationValidation({
          state,
          workspaceRoot,
          workspaceSlug: workspaceSlugResult.value,
        }).then((validatedState) => {
          const gating = {
            blocked: resolveWorkflowBlockedStages({
              state: validatedState,
              description,
            }),
          };
          res.json({
            state: validatedState,
            continuity: { chains },
            description,
            executionProfile,
            lastActive,
            gating,
          });
        });
      })
      .catch((error) => {
        this.logger.warn("Failed to read workflow metadata", {
          workspaceSlug: workspaceSlugResult.value,
          error: error instanceof Error ? error.message : String(error),
        });
        res.json({
          state,
          continuity: { chains: [] },
          description: null,
          executionProfile: null,
          lastActive: null,
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

const normalizeArtifactPath = (value: string): string =>
  value.replace(/\\/g, "/").trim();

const stageHasArtifact = (params: {
  readonly state: WorkflowState;
  readonly stage: WorkflowStageId;
  readonly fileName: string;
}): boolean =>
  params.state.stages[params.stage].artifacts.some((artifact) =>
    normalizeArtifactPath(artifact.path).endsWith(`/${params.fileName}`)
  );

const isStageDone = (params: {
  readonly state: WorkflowState;
  readonly stage: WorkflowStageId;
  readonly fileName: string;
}): boolean => {
  const stageState = params.state.stages[params.stage];
  if (stageState.status === "outdated" || stageState.status === "invalid") {
    return false;
  }
  return stageHasArtifact(params);
};

const resolveWorkflowBlockedStages = (params: {
  readonly state: WorkflowState;
  readonly description: {
    readonly finalPath?: string;
    readonly draftPath?: string;
  } | null;
}): Record<WorkflowStageId, boolean> => {
  const descriptionDone = Boolean(
    params.description?.finalPath ?? params.description?.draftPath
  );
  const virtualSimulationDone =
    descriptionDone &&
    isStageDone({
      state: params.state,
      stage: "virtual_simulation",
      fileName: "virtual-simulation.md",
    });
  const diagramModulesDone = isStageDone({
    state: params.state,
    stage: "diagram_modules",
    fileName: "modules-diagram.mmd",
  });
  const diagramModulesSatisfied = virtualSimulationDone && diagramModulesDone;

  return {
    description: false,
    virtual_simulation: !descriptionDone,
    diagram_modules: !virtualSimulationDone,
    diagram_facades: !diagramModulesSatisfied,
  };
};
