import { ManagedPlanOrchestratorInstaller } from "../../managed-workspace/managed-plan-orchestrator-installer";
import { ManagedWorkspaceBootstrapper } from "../../managed-workspace/managed-workspace-bootstrapper";
import {
  type ManagedWorkspaceValidationResult,
  ManagedWorkspaceValidator,
} from "../../managed-workspace/managed-workspace-validator";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { SessionResumeMode } from "../../workspace-runtime/workspace-runtime-types";
import type { SessionProviderFailureRecovery } from "./session-provider-failure-recovery";
import type { CreateAndRegisterSessionOptions } from "./session-request-handler-types";

export interface ManagedWorkspaceLifecycle {
  ensureReady(workspaceRoot: string): Promise<ManagedWorkspaceValidationResult>;
}

const MANAGED_WORKSPACE_STAGES = new Set([
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
]);

export const requiresManagedWorkspaceLifecycle = (stage: string): boolean =>
  MANAGED_WORKSPACE_STAGES.has(stage);

interface SessionRequestHandlerWorkflowSessionDependencies {
  readonly createAndRegisterSession: (
    options: CreateAndRegisterSessionOptions
  ) => Promise<Session | null>;
  readonly logger: Logger;
  readonly managedWorkspaceLifecycle?: ManagedWorkspaceLifecycle;
  readonly providerFailureRecovery: SessionProviderFailureRecovery;
  readonly providerRegistry: ProviderRegistry;
}

export class SessionRequestHandlerWorkflowSession {
  private readonly deps: SessionRequestHandlerWorkflowSessionDependencies;
  private readonly managedWorkspaceLifecycle: ManagedWorkspaceLifecycle;

  constructor(deps: SessionRequestHandlerWorkflowSessionDependencies) {
    this.deps = deps;
    this.managedWorkspaceLifecycle =
      deps.managedWorkspaceLifecycle ?? new DefaultManagedWorkspaceLifecycle();
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
    if (requiresManagedWorkspaceLifecycle(options.context.stage)) {
      const managedWorkspace = await this.managedWorkspaceLifecycle.ensureReady(
        options.workspacePath
      );
      if (!managedWorkspace.ok) {
        this.deps.logger.warn(
          "Workflow session creation blocked: managed workspace baseline invalid",
          {
            issues: managedWorkspace.issues,
            stage: options.context.stage,
            workspaceRoot: managedWorkspace.workspaceRoot,
          }
        );
        return null;
      }
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

export class DefaultManagedWorkspaceLifecycle
  implements ManagedWorkspaceLifecycle
{
  private readonly bootstrapper = new ManagedWorkspaceBootstrapper();
  private readonly installer = new ManagedPlanOrchestratorInstaller();
  private readonly validator = new ManagedWorkspaceValidator();

  async ensureReady(
    workspaceRoot: string
  ): Promise<ManagedWorkspaceValidationResult> {
    await this.bootstrapper.bootstrap(workspaceRoot);
    await this.installer.install(workspaceRoot);
    return await this.validator.validate(workspaceRoot);
  }
}
