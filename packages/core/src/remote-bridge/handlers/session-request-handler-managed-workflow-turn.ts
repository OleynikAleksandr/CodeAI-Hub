import { buildApplicationSkeletonBoundaryBlockedMessage } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder";
import { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import {
  type ApplicationSkeletonManagedValidationResult,
  validateApplicationSkeletonManagedArtifacts,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-validator";
import {
  buildDiagramModulesManagedCommitBoundaryBlockedMessage as buildDiagramBoundaryBlockedMessage,
  buildDiagramModulesManagedContinuationMessage,
} from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder";
import { DiagramModulesStagePlanController } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller";
import { commitDiagramModulesRejectedTurn } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-repair-controller";
import { validateDiagramModulesManagedArtifacts } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-validator";
import {
  buildApplicationSkeletonReviewHandoffMessage,
  buildManagedPersistentReturnHandoffMessage,
  buildManagedUserLedReviewHandoffMessage,
} from "../../managed-workflow-orchestration/managed-workflow-user-handoff-messages";
import { buildQualityGatesBoundaryBlockedMessage } from "../../managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder";
import { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import {
  type QualityGatesManagedValidationResult,
  validateQualityGatesManagedArtifacts,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-validator";
import type { Session } from "../../session-manager";
import { completeApplicationSkeletonMaterializedHandoff } from "./application-skeleton-completion-handoff";
import { buildApplicationSkeletonRepairDispatch } from "./application-skeleton-repair-prompt-dispatch";
import { ClusterContractTurnController } from "./cluster-contract-turn-controller";
import {
  buildDevelopmentTreeTurnFailureMessage,
  runGuardedDevelopmentTreeTurn,
} from "./development-tree-turn-guard";
import { dispatchDevelopmentTreeTurnResult } from "./development-tree-turn-result-dispatch";
import { buildDiagramModulesRepairDispatch } from "./diagram-modules-repair-prompt-dispatch";
import {
  buildContinuationDeliveryFailureMessage as buildDeliveryFailureMessage,
  dispatchManagedInternalContinuation as dispatchContinuation,
} from "./managed-internal-continuation-dispatch";
import {
  buildRepairLimitReviewMessage,
  isRepairAttemptLimitReached,
} from "./managed-repair-limit";
import { persistManagedDecision } from "./managed-workflow-decision-persister";
import {
  resolveApplicationSkeletonDraftRepairAttemptNumber,
  resolveDiagramModulesRepairAttemptNumber,
  resolveMaterializationRepairAttemptNumber,
} from "./managed-workflow-repair-attempts";
import { ProductPartDevelopmentBriefTurnController } from "./product-part-development-brief-turn-controller";
import { completeQualityGatesPersistentReturn } from "./quality-gates-persistent-return";
import {
  buildQualityGatesRepairDispatch,
  buildQualityGatesVerificationContinuation,
  resolveQualityGatesRepairAttemptNumber,
} from "./quality-gates-repair-prompt-dispatch";
import type { SessionRequestHandlerManagedWorkflowTurnOptions } from "./session-request-handler-managed-workflow-turn-options";
import { resolvePreliminaryArtifactGate } from "./session-request-handler-preliminary-artifact-gate";

const DIAGRAM_MODULES_STAGE = "diagram_modules";
const DESCRIPTION_STAGE = "description";
const APPLICATION_SKELETON_STAGE = "application_skeleton";
const QUALITY_GATES_STAGE = "quality_gates";
const VIRTUAL_SIMULATION_STAGE = "virtual_simulation";
const QUALITY_GATES_VERIFY_TASK_ID = "quality-gates.phase4.verify.task1";
const QUALITY_GATES_VERIFY_OPEN = {
  content:
    "Core: Quality Gates integration accepted. Phase 4 formal verification prompt sent.",
  tag: "managed-workflow-validation",
} as const;
export type ManagedWorkflowTurnCompletionResult =
  | "continued"
  | "not_managed"
  | "settled";
export class SessionRequestHandlerManagedWorkflowTurn {
  private readonly applicationStagePlan: ApplicationSkeletonStagePlanController;
  private readonly clusterContractTurn = new ClusterContractTurnController();
  private readonly diagramStagePlan: DiagramModulesStagePlanController;
  private readonly options: SessionRequestHandlerManagedWorkflowTurnOptions;
  private readonly productPartBriefTurn =
    new ProductPartDevelopmentBriefTurnController();
  private readonly qualityGatesStagePlan: QualityGatesStagePlanController;
  constructor(options: SessionRequestHandlerManagedWorkflowTurnOptions) {
    this.options = options;
    this.applicationStagePlan =
      options.applicationStagePlan ??
      new ApplicationSkeletonStagePlanController();
    this.diagramStagePlan =
      options.diagramStagePlan ?? new DiagramModulesStagePlanController();
    this.qualityGatesStagePlan =
      options.qualityGatesStagePlan ?? new QualityGatesStagePlanController();
  }
  async handleTurnCompleted(
    sessionId: string
  ): Promise<ManagedWorkflowTurnCompletionResult> {
    const session = this.options.sessionManager.getSession(sessionId) as
      | Session
      | null
      | undefined;
    if (!(session?.workspacePath && session.initiativeSlug && session.stage)) {
      return "not_managed";
    }
    if (
      session.stage === DESCRIPTION_STAGE ||
      session.stage === VIRTUAL_SIMULATION_STAGE
    ) {
      const gate = await resolvePreliminaryArtifactGate({
        stage: session.stage,
        assistantMessages: session.messages,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
      if (!gate) {
        return "not_managed";
      }
      this.appendCoreMessage(sessionId, gate);
      return "settled";
    }
    const managedParams = {
      sessionId,
      stage: session.stage,
      workspaceRoot: session.workspacePath,
      workspaceSlug: session.initiativeSlug,
    };
    if (session.stage === DIAGRAM_MODULES_STAGE) {
      return await this.handleDiagramModulesTurn(managedParams);
    }
    if (session.stage === APPLICATION_SKELETON_STAGE) {
      return await this.handleApplicationSkeletonTurn(managedParams);
    }
    if (session.stage === QUALITY_GATES_STAGE) {
      return await this.handleQualityGatesTurn(managedParams);
    }
    for (const developmentTreeTurn of [
      this.clusterContractTurn,
      this.productPartBriefTurn,
    ]) {
      const result = await runGuardedDevelopmentTreeTurn(
        () => developmentTreeTurn.handleTurnCompleted(managedParams),
        (error) => ({
          handled: true as const,
          message: buildDevelopmentTreeTurnFailureMessage(error),
        })
      );
      if (result.handled) {
        return dispatchDevelopmentTreeTurnResult({
          appendCoreMessage: (targetSessionId, payload) =>
            this.appendCoreMessage(targetSessionId, payload),
          dispatchAgentContinuation: (targetSessionId, content) =>
            this.dispatchAgentContinuation(targetSessionId, content),
          result,
          sessionId,
        });
      }
    }
    return "not_managed";
  }
  private async handleDiagramModulesTurn(params: {
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ManagedWorkflowTurnCompletionResult> {
    const decision = await validateDiagramModulesManagedArtifacts(params);
    await persistManagedDecision({
      decision,
      schema: "codeai-managed-workflow-diagram-modules-v1",
      sessionId: params.sessionId,
      stage: DIAGRAM_MODULES_STAGE,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (!decision.valid) {
      const planAdvance = await commitDiagramModulesRejectedTurn({
        decision,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
      if (planAdvance.blocked) {
        this.appendCoreMessage(params.sessionId, {
          content: buildDiagramBoundaryBlockedMessage(
            planAdvance.blocked.message
          ),
          tag: "managed-workflow-validation",
        });
        return "settled";
      }
      const attemptNumber = resolveDiagramModulesRepairAttemptNumber(
        planAdvance.commit.nextTaskId
      );
      if (isRepairAttemptLimitReached(attemptNumber)) {
        this.appendCoreMessage(
          params.sessionId,
          buildRepairLimitReviewMessage("Diagram Modules", decision.diagnostics)
        );
        return "settled";
      }
      const dispatch = buildDiagramModulesRepairDispatch(
        params,
        decision,
        planAdvance.commit.hash,
        attemptNumber
      );
      this.appendCoreMessage(params.sessionId, {
        content: dispatch.notice,
        tag: "managed-workflow-validation",
      });
      this.dispatchAgentContinuation(params.sessionId, dispatch.prompt);
      return "continued";
    }
    const planAdvance = await this.diagramStagePlan.commitAcceptedTurn({
      decision,
      sessionId: params.sessionId,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (planAdvance.blocked) {
      this.appendCoreMessage(params.sessionId, {
        content: buildDiagramBoundaryBlockedMessage(
          planAdvance.blocked.message
        ),
        tag: "managed-workflow-validation",
      });
      return "settled";
    }
    if (decision.nextAction === "dispatch_next_product_part") {
      const nextPrompt = decision.nextPrompt;
      if (nextPrompt) {
        this.dispatchAgentContinuation(
          params.sessionId,
          [
            buildDiagramModulesManagedContinuationMessage(
              decision.currentPartId
            ),
            "",
            nextPrompt,
          ].join("\n")
        );
      }
      return "continued";
    }
    if (decision.nextAction === "open_user_review") {
      this.appendCoreMessage(params.sessionId, {
        content: buildManagedUserLedReviewHandoffMessage("Diagram Modules"),
        tag: "managed-workflow-user-review",
      });
    }
    return "settled";
  }
  private async handleApplicationSkeletonTurn(params: {
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ManagedWorkflowTurnCompletionResult> {
    const decision = await validateApplicationSkeletonManagedArtifacts(params);
    await persistManagedDecision({
      decision,
      schema: "codeai-managed-workflow-application-skeleton-v1",
      sessionId: params.sessionId,
      stage: APPLICATION_SKELETON_STAGE,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (!decision.valid) {
      const planAdvance = await this.applicationStagePlan.commitRejectedTurn({
        decision,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
      if (planAdvance.blocked) {
        this.appendCoreMessage(params.sessionId, {
          content: buildApplicationSkeletonBoundaryBlockedMessage(
            planAdvance.blocked.message
          ),
          tag: "managed-workflow-validation",
        });
        return "settled";
      }
      return this.dispatchApplicationRepairPrompt(params, decision, {
        rejectedCommitHash: planAdvance.commit.hash,
        repairTaskId: planAdvance.commit.nextTaskId,
      });
    }
    const planAdvance = await this.applicationStagePlan.commitManagedTurn({
      decision,
      sessionId: params.sessionId,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (planAdvance.blocked) {
      this.appendCoreMessage(params.sessionId, {
        content: buildApplicationSkeletonBoundaryBlockedMessage(
          planAdvance.blocked.message
        ),
        tag: "managed-workflow-validation",
      });
      return "settled";
    }
    if (decision.nextAction === "open_user_review") {
      this.appendCoreMessage(params.sessionId, {
        content: buildApplicationSkeletonReviewHandoffMessage("draft_contract"),
        tag: "managed-workflow-user-review",
      });
      return "settled";
    }
    if (decision.nextAction === "open_persistent_return") {
      await completeApplicationSkeletonMaterializedHandoff({
        eventMessages: this.options.eventMessages,
        sessionId: params.sessionId,
        stagePlan: this.applicationStagePlan,
        workspaceRoot: params.workspaceRoot,
      });
    }
    return "settled";
  }
  private dispatchApplicationRepairPrompt(
    params: {
      readonly sessionId: string;
      readonly workspaceSlug: string;
    },
    decision: ApplicationSkeletonManagedValidationResult,
    rejected: {
      readonly rejectedCommitHash: string;
      readonly repairTaskId: string | null;
    } | null
  ): ManagedWorkflowTurnCompletionResult {
    const attemptNumber =
      decision.nextAction === "repair_materialization"
        ? resolveMaterializationRepairAttemptNumber(
            rejected?.repairTaskId ?? null
          )
        : resolveApplicationSkeletonDraftRepairAttemptNumber(
            rejected?.repairTaskId ?? null
          );
    if (isRepairAttemptLimitReached(attemptNumber)) {
      this.appendCoreMessage(
        params.sessionId,
        buildRepairLimitReviewMessage(
          "Application Skeleton",
          decision.diagnostics
        )
      );
      return "settled";
    }
    const dispatch = buildApplicationSkeletonRepairDispatch(
      params,
      decision,
      rejected,
      attemptNumber
    );
    this.appendCoreMessage(params.sessionId, {
      content: dispatch.notice,
      tag: "managed-workflow-validation",
    });
    this.dispatchAgentContinuation(params.sessionId, dispatch.prompt);
    return "continued";
  }
  private async handleQualityGatesTurn(params: {
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ManagedWorkflowTurnCompletionResult> {
    const decision = await validateQualityGatesManagedArtifacts(params);
    await persistManagedDecision({
      decision,
      schema: "codeai-managed-workflow-quality-gates-v1",
      sessionId: params.sessionId,
      stage: QUALITY_GATES_STAGE,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (!decision.valid) {
      const planAdvance = await this.qualityGatesStagePlan.commitRejectedTurn({
        decision,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
      if (planAdvance.blocked) {
        this.appendCoreMessage(params.sessionId, {
          content: buildQualityGatesBoundaryBlockedMessage(
            planAdvance.blocked.message
          ),
          tag: "managed-workflow-validation",
        });
        return "settled";
      }
      return this.dispatchQualityGatesRepairPrompt(params, decision, {
        rejectedCommitHash: planAdvance.commit.hash,
        repairTaskId: planAdvance.commit.nextTaskId,
      });
    }
    const planAdvance = await this.qualityGatesStagePlan.commitManagedTurn({
      decision,
      sessionId: params.sessionId,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (planAdvance.blocked) {
      this.appendCoreMessage(params.sessionId, {
        content: buildQualityGatesBoundaryBlockedMessage(
          planAdvance.blocked.message
        ),
        tag: "managed-workflow-validation",
      });
      return "settled";
    }
    if (planAdvance.commit.nextTaskId === QUALITY_GATES_VERIFY_TASK_ID) {
      this.appendCoreMessage(params.sessionId, QUALITY_GATES_VERIFY_OPEN);
      this.dispatchAgentContinuation(
        params.sessionId,
        buildQualityGatesVerificationContinuation(params.workspaceSlug)
      );
      return "continued";
    }
    const completesStage =
      decision.phase === "verification" &&
      decision.nextAction === "open_persistent_return";
    if (decision.nextAction !== "open_user_review" && !completesStage) {
      return this.dispatchQualityGatesRepairPrompt(params, decision, null);
    }
    this.appendCoreMessage(params.sessionId, {
      content: completesStage
        ? buildManagedPersistentReturnHandoffMessage("Quality Gates")
        : buildManagedUserLedReviewHandoffMessage("Quality Gates"),
      tag: completesStage
        ? "managed-workflow-complete"
        : "managed-workflow-user-review",
    });
    if (completesStage) {
      const { eventMessages } = this.options;
      await completeQualityGatesPersistentReturn({
        sessionId: params.sessionId,
        stagePlan: this.qualityGatesStagePlan,
        waitForMessagePersistence: (sessionId) =>
          eventMessages.waitForMessagePersistence?.(sessionId) ??
          Promise.resolve(),
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
    }
    return "settled";
  }
  private dispatchQualityGatesRepairPrompt(
    params: {
      readonly sessionId: string;
      readonly workspaceSlug: string;
    },
    decision: QualityGatesManagedValidationResult,
    rejected: {
      readonly rejectedCommitHash: string;
      readonly repairTaskId: string | null;
    } | null
  ): ManagedWorkflowTurnCompletionResult {
    const attemptNumber = resolveQualityGatesRepairAttemptNumber(
      rejected?.repairTaskId ?? null
    );
    if (isRepairAttemptLimitReached(attemptNumber)) {
      this.appendCoreMessage(
        params.sessionId,
        buildRepairLimitReviewMessage("Quality Gates", decision.diagnostics)
      );
      return "settled";
    }
    const dispatch = buildQualityGatesRepairDispatch(
      params,
      decision,
      rejected
    );
    this.appendCoreMessage(params.sessionId, {
      content: dispatch.notice,
      tag: "managed-workflow-validation",
    });
    this.dispatchAgentContinuation(params.sessionId, dispatch.prompt);
    return "continued";
  }
  private dispatchAgentContinuation(sessionId: string, content: string): void {
    dispatchContinuation(this.options.getMessageDispatch(), {
      content,
      onDeliveryFailure: (error) => {
        this.appendCoreMessage(sessionId, {
          content: buildDeliveryFailureMessage(error),
          tag: "managed-workflow-validation",
        });
      },
      session: this.options.sessionManager.getSession(sessionId),
      sessionId,
    });
  }
  private appendCoreMessage(
    sessionId: string,
    payload: { readonly content: string; readonly tag: string }
  ): void {
    this.options.eventMessages.appendCoreMessage(sessionId, payload);
  }
}
