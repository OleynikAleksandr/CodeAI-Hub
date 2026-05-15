import { ManagedWorkflowOrchestrationFacade } from "../../managed-workflow-orchestration";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { SessionResumeMode } from "../../workspace-runtime/workspace-runtime-types";
import type { SessionProviderFailureRecovery } from "./session-provider-failure-recovery";
import type { CreateAndRegisterSessionOptions } from "./session-request-handler-types";

export const TECHNICAL_STAGE_REWRITE_BLOCKER_CODE =
  "managed_workflow_preview_boundary";

const defaultManagedWorkflowOrchestration =
  new ManagedWorkflowOrchestrationFacade();

export const isTechnicalStageRewriteBlockedStage = (stage: string): boolean =>
  defaultManagedWorkflowOrchestration.canHandleStage(stage);

interface SessionRequestHandlerWorkflowSessionDependencies {
  readonly createAndRegisterSession: (
    options: CreateAndRegisterSessionOptions
  ) => Promise<Session | null>;
  readonly logger: Logger;
  readonly managedWorkflowOrchestration?: ManagedWorkflowOrchestrationFacade;
  readonly providerFailureRecovery: SessionProviderFailureRecovery;
  readonly providerRegistry: ProviderRegistry;
}

export class SessionRequestHandlerWorkflowSession {
  private readonly deps: SessionRequestHandlerWorkflowSessionDependencies;
  private readonly managedWorkflowOrchestration: ManagedWorkflowOrchestrationFacade;

  constructor(deps: SessionRequestHandlerWorkflowSessionDependencies) {
    this.deps = deps;
    this.managedWorkflowOrchestration =
      deps.managedWorkflowOrchestration ?? defaultManagedWorkflowOrchestration;
  }

  async createSessionForWorkflow(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly context: {
      readonly initiativeSlug: string;
      readonly stage: string;
      readonly runSlug?: string | null;
      readonly resumeMode?: SessionResumeMode;
    };
  }): Promise<Session | null> {
    const managedDecision = this.managedWorkflowOrchestration.previewStageStart(
      {
        providerId: options.providerId,
        runSlug: options.context.runSlug ?? null,
        stageId: options.context.stage,
        workspaceRoot: options.workspacePath,
        workspaceSlug: options.context.initiativeSlug,
      }
    );
    if (managedDecision) {
      this.deps.logger.warn(
        "Workflow session creation routed to managed workflow preview boundary",
        {
          code: managedDecision.code,
          controllerId: managedDecision.controllerId,
          message: managedDecision.message,
          stage: options.context.stage,
          workspaceRoot: options.workspacePath,
        }
      );
      return null;
    }

    const adapter = this.deps.providerRegistry.getAdapter(options.providerId);
    if (!adapter) {
      this.deps.logger.warn(
        "Workflow session creation failed: provider missing",
        {
          providerId: options.providerId,
        }
      );
      return null;
    }
    try {
      return await this.deps.createAndRegisterSession({
        providerId: options.providerId,
        workspacePath: options.workspacePath,
        adapter,
        resumeMode: options.context.resumeMode,
        context: {
          initiativeSlug: options.context.initiativeSlug,
          stage: options.context.stage,
          runSlug: options.context.runSlug ?? null,
          providerSessionId: null,
        },
      });
    } catch (error) {
      this.deps.providerFailureRecovery.handleProviderFailure(
        options.providerId,
        error
      );
      return null;
    }
  }
}
