import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import {
  buildApplicationSkeletonBoundaryBlockedMessage,
  buildApplicationSkeletonDraftRepairPrompt,
  buildApplicationSkeletonMaterializationRepairPrompt,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder";
import { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import {
  type ApplicationSkeletonManagedValidationResult,
  validateApplicationSkeletonManagedArtifacts,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-validator";
import {
  buildDiagramModulesManagedCommitBoundaryBlockedMessage as buildDiagramBoundaryBlockedMessage,
  buildDiagramModulesManagedContinuationMessage,
  buildDiagramModulesProductPartRepairPrompt,
} from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder";
import { DiagramModulesStagePlanController } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller";
import { commitDiagramModulesRejectedTurn } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-repair-controller";
import { parseDiagramModulesRepairTaskNumber } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-repair-model";
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
import type { Session, SessionManager } from "../../session-manager";
import { completeApplicationSkeletonMaterializedHandoff } from "./application-skeleton-completion-handoff";
import { DevelopmentTreeQualityGatesHandoffBootstrap } from "./development-tree-quality-gates-handoff-bootstrap";
import { dispatchManagedInternalContinuation as dispatchContinuation } from "./managed-internal-continuation-dispatch";
import { persistManagedDecision } from "./managed-workflow-decision-persister";
import { ProductPartDevelopmentBriefTurnController } from "./product-part-development-brief-turn-controller";
import { buildQualityGatesRepairDispatch } from "./quality-gates-repair-prompt-dispatch";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";
import type { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";
import { resolvePreliminaryArtifactGate } from "./session-request-handler-preliminary-artifact-gate";

const DIAGRAM_MODULES_STAGE = "diagram_modules";
const DESCRIPTION_STAGE = "description";
const APPLICATION_SKELETON_STAGE = "application_skeleton";
const QUALITY_GATES_STAGE = "quality_gates";
const VIRTUAL_SIMULATION_STAGE = "virtual_simulation";
const APPLICATION_SKELETON_MATERIALIZATION_REPAIR_TASK_RE =
  /^application-skeleton\.phase3\.repair\.task(\d+)$/u;
const QUALITY_GATES_VERIFY_TASK_ID = "quality-gates.phase4.verify.task1";
export type ManagedWorkflowTurnCompletionResult =
  | "continued"
  | "not_managed"
  | "settled";
interface ManagedWorkflowTurnEventMessages {
  readonly appendCoreMessage: SessionRequestHandlerEventMessages["appendCoreMessage"];
  readonly waitForMessagePersistence?: SessionRequestHandlerEventMessages["waitForMessagePersistence"];
}
interface SessionRequestHandlerManagedWorkflowTurnOptions {
  readonly applicationStagePlan?: ApplicationSkeletonStagePlanController;
  readonly developmentTreeAgentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly diagramStagePlan?: DiagramModulesStagePlanController;
  readonly eventMessages: ManagedWorkflowTurnEventMessages;
  readonly getMessageDispatch: () => SessionRequestHandlerMessageDispatch;
  readonly qualityGatesStagePlan?: QualityGatesStagePlanController;
  readonly sessionManager: Pick<SessionManager, "getSession">;
}
const resolveMaterializationRepairAttemptNumber = (
  taskId: string | null
): number => {
  const match = taskId?.match(
    APPLICATION_SKELETON_MATERIALIZATION_REPAIR_TASK_RE
  );
  const value = Number(match?.[1]);
  return Number.isInteger(value) && value > 0 ? value : 1;
};

const buildQualityGatesVerificationContinuation = (
  workspaceSlug: string
): string =>
  [
    "Core opens Phase 4 Formal Quality Gates Verification.",
    `Verify \`.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json\` and the integrated enforcement surface before persistent return.`,
    'Resolve hook `npm run <script>` calls against `package.json`, run available `qg:*` aggregate commands and Husky hook scripts, then record `verificationState: "verified"` with command evidence.',
    "Do not run Git commands or edit stage todo files.",
  ].join("\n");
const resolveDiagramModulesRepairAttemptNumber = (
  taskId: string | null
): number => parseDiagramModulesRepairTaskNumber(taskId ?? "") ?? 1;
export class SessionRequestHandlerManagedWorkflowTurn {
  private readonly applicationStagePlan: ApplicationSkeletonStagePlanController;
  private readonly diagramStagePlan: DiagramModulesStagePlanController;
  private readonly options: SessionRequestHandlerManagedWorkflowTurnOptions;
  private readonly productPartBootstrap =
    new DevelopmentTreeQualityGatesHandoffBootstrap();
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
    if (session.stage === DIAGRAM_MODULES_STAGE) {
      return await this.handleDiagramModulesTurn({
        sessionId,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
    }
    if (session.stage === APPLICATION_SKELETON_STAGE) {
      return await this.handleApplicationSkeletonTurn({
        sessionId,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
    }
    if (session.stage === QUALITY_GATES_STAGE) {
      return await this.handleQualityGatesTurn({
        sessionId,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
    }
    const productPartTurn = await this.productPartBriefTurn.handleTurnCompleted(
      {
        sessionId,
        stage: session.stage,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      }
    );
    if (productPartTurn.handled) {
      this.appendCoreMessage(sessionId, productPartTurn.message);
      return "settled";
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
      const repairPrompt = buildDiagramModulesProductPartRepairPrompt({
        attemptNumber: resolveDiagramModulesRepairAttemptNumber(
          planAdvance.commit.nextTaskId
        ),
        currentPartId: decision.currentPartId,
        diagnostics: decision.diagnostics,
        rejectedCommitHash: planAdvance.commit.hash,
        workspaceSlug: params.workspaceSlug,
      });
      const repairTarget = decision.currentPartId
        ? `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${decision.currentPartId}.md`
        : `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`;
      this.appendCoreMessage(params.sessionId, {
        content: [
          "Core: Diagram Modules требует исправить staged artifact.",
          `Target artifact: \`${repairTarget}\`.`,
          "Diagnostics:",
          ...decision.diagnostics.map((diagnostic) => `- ${diagnostic}`),
          "Полный repair prompt отправлен агенту внутренним сообщением.",
        ].join("\n"),
        tag: "managed-workflow-validation",
      });
      this.dispatchAgentContinuation(params.sessionId, repairPrompt);
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
      this.dispatchApplicationRepairPrompt(params, decision, {
        rejectedCommitHash: planAdvance.commit.hash,
        repairTaskId: planAdvance.commit.nextTaskId,
      });
      return "continued";
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
  ): void {
    const repairPrompt =
      decision.nextAction === "repair_materialization"
        ? buildApplicationSkeletonMaterializationRepairPrompt({
            attemptNumber: resolveMaterializationRepairAttemptNumber(
              rejected?.repairTaskId ?? null
            ),
            diagnostics: decision.diagnostics,
            rejectedCommitHash: rejected?.rejectedCommitHash ?? null,
            workspaceSlug: params.workspaceSlug,
          })
        : (decision.nextPrompt ??
          buildApplicationSkeletonDraftRepairPrompt({
            diagnostics: decision.diagnostics,
            workspaceSlug: params.workspaceSlug,
          }));
    this.appendCoreMessage(params.sessionId, {
      content: [
        `Core: Application Skeleton требует исправить ${
          decision.phase === "materialization" ? "материализацию" : "черновик"
        }.`,
        "Полный repair prompt отправлен агенту внутренним сообщением.",
      ].join("\n"),
      tag: "managed-workflow-validation",
    });
    this.dispatchAgentContinuation(params.sessionId, repairPrompt);
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
      this.dispatchQualityGatesRepairPrompt(params, decision, {
        rejectedCommitHash: planAdvance.commit.hash,
        repairTaskId: planAdvance.commit.nextTaskId,
      });
      return "continued";
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
      this.appendCoreMessage(params.sessionId, {
        content:
          "Core: Quality Gates integration accepted. Phase 4 formal verification prompt sent.",
        tag: "managed-workflow-validation",
      });
      this.dispatchAgentContinuation(
        params.sessionId,
        buildQualityGatesVerificationContinuation(params.workspaceSlug)
      );
      return "continued";
    }
    const completesStage = decision.nextAction === "open_persistent_return";
    if (decision.nextAction !== "open_user_review" && !completesStage) {
      return "settled";
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
      await eventMessages.waitForMessagePersistence?.(params.sessionId);
      await this.qualityGatesStagePlan.commitTerminalHandoffResidue({
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
      await this.productPartBootstrap.bootstrap({
        agentGateway: this.options.developmentTreeAgentGateway,
        sessionId: params.sessionId,
        sessionManager: this.options.sessionManager,
        stagePlan: this.qualityGatesStagePlan,
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
  ): void {
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
  }
  private dispatchAgentContinuation(sessionId: string, content: string): void {
    dispatchContinuation(this.options.getMessageDispatch(), {
      content,
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
