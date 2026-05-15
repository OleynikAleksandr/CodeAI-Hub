import { readFile } from "node:fs/promises";
import path from "node:path";
import { ManagedWorkflowOrchestrationFacade } from "../../managed-workflow-orchestration";
import { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import { ManagedWorkflowScaffoldInstaller } from "../../managed-workflow-orchestration/managed-workflow-scaffold-installer";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { SessionResumeMode } from "../../workspace-runtime/workspace-runtime-types";
import type { SessionProviderFailureRecovery } from "./session-provider-failure-recovery";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";
import type { CreateAndRegisterSessionOptions } from "./session-request-handler-types";

export const TECHNICAL_STAGE_REWRITE_BLOCKER_CODE =
  "managed_workflow_preview_boundary";

const defaultManagedWorkflowOrchestration =
  new ManagedWorkflowOrchestrationFacade();
const APPLICATION_SKELETON_STAGE = "application_skeleton";
const APPLICATION_SKELETON_BOOTSTRAP_TASK_ID =
  "application-skeleton.phase1.bootstrap.task1";
const APPLICATION_SKELETON_STAGE_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const PLAN_START = "<!-- codeai-plan-state:start -->";
const PLAN_END = "<!-- codeai-plan-state:end -->";

export const isTechnicalStageRewriteBlockedStage = (stage: string): boolean =>
  defaultManagedWorkflowOrchestration.resolveStageStart({
    providerId: "core",
    stageId: stage,
    workspaceRoot: "",
    workspaceSlug: "",
  })?.code === TECHNICAL_STAGE_REWRITE_BLOCKER_CODE;

interface SessionRequestHandlerWorkflowSessionDependencies {
  readonly applicationSkeletonStagePlan?: ApplicationSkeletonStagePlanController;
  readonly createAndRegisterSession: (
    options: CreateAndRegisterSessionOptions
  ) => Promise<Session | null>;
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage"
  >;
  readonly logger: Logger;
  readonly managedWorkflowOrchestration?: ManagedWorkflowOrchestrationFacade;
  readonly providerFailureRecovery: SessionProviderFailureRecovery;
  readonly providerRegistry: ProviderRegistry;
  readonly scaffoldInstaller?: ManagedWorkflowScaffoldInstaller;
  readonly sessionManager: SessionManager;
}

export class SessionRequestHandlerWorkflowSession {
  private readonly deps: SessionRequestHandlerWorkflowSessionDependencies;
  private readonly applicationSkeletonStagePlan: ApplicationSkeletonStagePlanController;
  private readonly managedWorkflowOrchestration: ManagedWorkflowOrchestrationFacade;
  private readonly scaffoldInstaller: ManagedWorkflowScaffoldInstaller;

  constructor(deps: SessionRequestHandlerWorkflowSessionDependencies) {
    this.deps = deps;
    this.applicationSkeletonStagePlan =
      deps.applicationSkeletonStagePlan ??
      new ApplicationSkeletonStagePlanController();
    this.managedWorkflowOrchestration =
      deps.managedWorkflowOrchestration ?? defaultManagedWorkflowOrchestration;
    this.scaffoldInstaller =
      deps.scaffoldInstaller ?? new ManagedWorkflowScaffoldInstaller();
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
    const managedDecision = this.managedWorkflowOrchestration.resolveStageStart(
      {
        providerId: options.providerId,
        runSlug: options.context.runSlug ?? null,
        stageId: options.context.stage,
        workspaceRoot: options.workspacePath,
        workspaceSlug: options.context.initiativeSlug,
      }
    );
    if (managedDecision && !managedDecision.canDispatchProvider) {
      const session = this.deps.sessionManager.createSession(
        options.providerId,
        options.workspacePath,
        undefined,
        {
          initiativeSlug: options.context.initiativeSlug,
          runSlug: options.context.runSlug ?? null,
          stage: options.context.stage,
        }
      );
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: managedDecision.message,
        tag: "managed-workflow-preview",
      });
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
      return session;
    }
    if (managedDecision?.mode === "managed_dispatch") {
      await this.scaffoldInstaller.installDiagramModulesScaffold({
        workspaceRoot: options.workspacePath,
      });
      if (
        options.context.stage === APPLICATION_SKELETON_STAGE &&
        (await this.shouldOpenApplicationSkeletonDraft(options.workspacePath))
      ) {
        await this.applicationSkeletonStagePlan.openDraftPhase({
          workspaceRoot: options.workspacePath,
        });
      }
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

  private async shouldOpenApplicationSkeletonDraft(
    workspaceRoot: string
  ): Promise<boolean> {
    const planText = await readFile(
      path.join(workspaceRoot, APPLICATION_SKELETON_STAGE_PLAN_PATH),
      "utf8"
    ).catch(() => null);
    if (!planText) {
      return true;
    }
    const rawState = planText.split(PLAN_START)[1]?.split(PLAN_END)[0];
    const json = rawState
      ?.trim()
      .replace(FENCED_JSON_START_RE, "")
      .replace(FENCED_JSON_END_RE, "")
      .trim();
    if (!json) {
      return true;
    }
    const state = JSON.parse(json) as { readonly currentTaskId?: unknown };
    return (
      state.currentTaskId === null ||
      state.currentTaskId === APPLICATION_SKELETON_BOOTSTRAP_TASK_ID
    );
  }
}
