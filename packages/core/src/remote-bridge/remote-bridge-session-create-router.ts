import { access } from "node:fs/promises";
import path from "node:path";
import type { Logger } from "../telemetry/logger";
import { WorkflowBoundaryFacade } from "../workflow/boundary/workflow-boundary-facade";
import { WorkflowBoundaryGit } from "../workflow/boundary/workflow-boundary-git";
import {
  getWorkflowBoundaryStageLabel,
  isWorkflowBoundaryStage,
} from "../workflow/boundary/workflow-boundary-model";
import type { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import {
  bootstrapWorkspaceRuntimeCapsule,
  prepareWorkspaceRuntimeCapsuleDirectories,
  resolveWorkspaceRuntimeCapsule,
} from "../workflow/runtime/workspace-runtime-capsule";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import {
  isTechnicalStageRewriteBlockedStage,
  TECHNICAL_STAGE_REWRITE_BLOCKER_CODE,
} from "./handlers/session-request-handler-workflow-session";
import type { WebSocketManager } from "./handlers/websocket-manager";
import { prepareWorkflowStageDirectories } from "./handlers/workspace-session-service";
import type { IncomingMessage } from "./types";

const isTechnicalStageRewriteStage = (
  stage: string | null | undefined
): boolean =>
  typeof stage === "string" && isTechnicalStageRewriteBlockedStage(stage);

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

interface RemoteBridgeSessionCreateRouterDependencies {
  readonly getManager: () => WebSocketManager | undefined;
  readonly logger: Logger;
  readonly sessionHandler: SessionRequestHandler;
  readonly workflowBoundaryFacade?: Pick<
    WorkflowBoundaryFacade,
    "ensureBoundary"
  >;
  readonly workflowGit?: Pick<
    WorkflowBoundaryGit,
    "commit" | "statusPorcelain"
  >;
  readonly workflowRuntime: WorkflowRuntime;
}

interface WorkflowSessionCreatePreflightParams {
  readonly initiativeSlug: string;
  readonly runSlug: string | null;
  readonly stage: string | null;
  readonly workspacePath: string;
}

export class RemoteBridgeSessionCreateRouter {
  private readonly deps: RemoteBridgeSessionCreateRouterDependencies;

  constructor(deps: RemoteBridgeSessionCreateRouterDependencies) {
    this.deps = deps;
  }

  async handle(
    clientId: string,
    incoming: Extract<IncomingMessage, { readonly type: "session:create" }>
  ): Promise<void> {
    const resolvedWorkspacePath =
      incoming.payload?.workspacePath ??
      this.deps.getManager()?.getWorkspaceScope(clientId)?.workspacePath ??
      undefined;
    const initiativeSlug = incoming.payload?.initiativeSlug ?? null;
    const requestedProviderId =
      incoming.payload?.providerId ??
      incoming.payload?.modelSelection?.providerId ??
      undefined;
    const targetModelId =
      incoming.payload?.targetModelId ??
      incoming.payload?.modelSelection?.modelId ??
      null;
    const createContext = {
      initiativeSlug,
      providerSessionId: incoming.payload?.providerSessionId ?? null,
      stage: incoming.payload?.stage ?? null,
      runSlug: incoming.payload?.runSlug ?? null,
      targetModelId,
    };

    if (!(resolvedWorkspacePath && initiativeSlug)) {
      await this.deps.sessionHandler.handleCreate(
        requestedProviderId,
        resolvedWorkspacePath,
        createContext
      );
      return;
    }

    try {
      await this.commitWorkflowStartSettings({
        initiativeSlug,
        stage: createContext.stage,
        workspacePath: resolvedWorkspacePath,
      });
      await this.ensureWorkflowBoundary({
        initiativeSlug,
        runSlug: createContext.runSlug,
        stage: createContext.stage,
        workspacePath: resolvedWorkspacePath,
      });
      await this.prepareStagePreflight({
        initiativeSlug,
        runSlug: createContext.runSlug,
        stage: createContext.stage,
        workspacePath: resolvedWorkspacePath,
      });
    } catch (error: unknown) {
      this.deps.logger.warn("Failed to prepare workflow stage directories", {
        workspacePath: resolvedWorkspacePath,
        workspaceSlug: initiativeSlug,
        stage: createContext.stage,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    await this.deps.sessionHandler.handleCreate(
      requestedProviderId,
      resolvedWorkspacePath,
      createContext
    );

    try {
      await this.deps.workflowRuntime.connectWorkspace({
        workspaceRoot: resolvedWorkspacePath,
        workspaceSlug: initiativeSlug,
      });
    } catch (error: unknown) {
      this.deps.logger.warn(
        "Failed to connect workflow runtime from session:create",
        {
          workspacePath: resolvedWorkspacePath,
          workspaceSlug: initiativeSlug,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  private async ensureWorkflowBoundary(
    params: WorkflowSessionCreatePreflightParams
  ): Promise<void> {
    if (!(params.stage && isWorkflowBoundaryStage(params.stage))) {
      return;
    }
    if (params.stage === "description") {
      await bootstrapWorkspaceRuntimeCapsule({
        workspaceRoot: params.workspacePath,
        workspaceSlug: params.initiativeSlug,
      });
    } else {
      await prepareWorkspaceRuntimeCapsuleDirectories({
        workspaceRoot: params.workspacePath,
        workspaceSlug: params.initiativeSlug,
      });
    }
    await (
      this.deps.workflowBoundaryFacade ?? new WorkflowBoundaryFacade()
    ).ensureBoundary({
      stage: params.stage,
      workspaceRoot: params.workspacePath,
      workspaceSlug: params.initiativeSlug,
    });
  }

  private async prepareStagePreflight(
    params: WorkflowSessionCreatePreflightParams
  ): Promise<void> {
    if (isTechnicalStageRewriteStage(params.stage)) {
      this.deps.logger.warn(
        "Session create skipped technical stage preflight during orchestration rewrite",
        {
          code: TECHNICAL_STAGE_REWRITE_BLOCKER_CODE,
          stage: params.stage,
          workspacePath: params.workspacePath,
          workspaceSlug: params.initiativeSlug,
        }
      );
      return;
    }
    await prepareWorkflowStageDirectories({
      initiativeSlug: params.initiativeSlug,
      runSlug: params.runSlug,
      stage: params.stage,
      workspacePath: params.workspacePath,
    });
  }

  private async commitWorkflowStartSettings(
    params: Pick<
      WorkflowSessionCreatePreflightParams,
      "initiativeSlug" | "stage" | "workspacePath"
    >
  ): Promise<void> {
    if (!(params.stage && isWorkflowBoundaryStage(params.stage))) {
      return;
    }
    const capsule = resolveWorkspaceRuntimeCapsule({
      workspaceRoot: params.workspacePath,
      workspaceSlug: params.initiativeSlug,
    });
    if (!(await pathExists(path.join(params.workspacePath, ".git")))) {
      return;
    }
    const git = this.deps.workflowGit ?? new WorkflowBoundaryGit();
    const dirtyPaths = await git.statusPorcelain(params.workspacePath);
    const settingsDirty = dirtyPaths.some(
      (entry) => entry.slice(3).trim() === capsule.settingsFile.relativePath
    );
    if (!settingsDirty) {
      return;
    }
    await git.commit({
      allowEmpty: false,
      commitMessage: `codeai-settings: ${getWorkflowBoundaryStageLabel(params.stage)} start selection`,
      paths: [capsule.settingsFile.relativePath],
      workspaceRoot: params.workspacePath,
    });
  }
}
