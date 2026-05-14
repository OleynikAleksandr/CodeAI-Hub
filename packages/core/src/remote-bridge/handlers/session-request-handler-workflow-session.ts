import type { ProviderRegistry } from "../../provider-registry";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { SessionResumeMode } from "../../workspace-runtime/workspace-runtime-types";
import type { SessionProviderFailureRecovery } from "./session-provider-failure-recovery";
import type { CreateAndRegisterSessionOptions } from "./session-request-handler-types";

export const MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE =
  "managed_workflow_rewrite_in_progress";

const MANAGED_WORKFLOW_REWRITE_BLOCKED_STAGES = new Set([
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
]);

export const isManagedWorkflowRewriteBlockedStage = (stage: string): boolean =>
  MANAGED_WORKFLOW_REWRITE_BLOCKED_STAGES.has(stage);

interface SessionRequestHandlerWorkflowSessionDependencies {
  readonly createAndRegisterSession: (
    options: CreateAndRegisterSessionOptions
  ) => Promise<Session | null>;
  readonly logger: Logger;
  readonly providerFailureRecovery: SessionProviderFailureRecovery;
  readonly providerRegistry: ProviderRegistry;
}

export class SessionRequestHandlerWorkflowSession {
  private readonly deps: SessionRequestHandlerWorkflowSessionDependencies;

  constructor(deps: SessionRequestHandlerWorkflowSessionDependencies) {
    this.deps = deps;
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
    if (isManagedWorkflowRewriteBlockedStage(options.context.stage)) {
      this.deps.logger.warn(
        "Workflow session creation blocked: managed workflow rewrite in progress",
        {
          code: MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE,
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
