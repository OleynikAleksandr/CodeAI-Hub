import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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
import {
  type DiagramModulesManagedValidationResult,
  validateDiagramModulesManagedArtifacts,
} from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-validator";
import {
  buildManagedPersistentReturnHandoffMessage,
  buildManagedUserLedReviewHandoffMessage,
} from "../../managed-workflow-orchestration/managed-workflow-user-handoff-messages";
import {
  buildQualityGatesBoundaryBlockedMessage,
  buildQualityGatesDraftRepairPrompt,
  buildQualityGatesIntegrationRepairPrompt,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder";
import { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import {
  type QualityGatesManagedValidationResult,
  validateQualityGatesManagedArtifacts,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-validator";
import type { SessionManager } from "../../session-manager";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";
import type { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";

const DIAGRAM_MODULES_STAGE = "diagram_modules";
const DESCRIPTION_STAGE = "description";
const APPLICATION_SKELETON_STAGE = "application_skeleton";
const QUALITY_GATES_STAGE = "quality_gates";
const VIRTUAL_SIMULATION_STAGE = "virtual_simulation";
const APPLICATION_SKELETON_MATERIALIZATION_REPAIR_TASK_RE =
  /^application-skeleton\.phase3\.repair\.task(\d+)$/u;
const QUALITY_GATES_INTEGRATION_REPAIR_TASK_RE =
  /^quality-gates\.phase3\.repair\.task(\d+)$/u;

interface ManagedWorkflowTurnSession {
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly workspacePath?: string | null;
}

interface ManagedWorkflowTurnEventMessages {
  readonly appendCoreMessage: SessionRequestHandlerEventMessages["appendCoreMessage"];
  readonly waitForMessagePersistence?: SessionRequestHandlerEventMessages["waitForMessagePersistence"];
}

interface SessionRequestHandlerManagedWorkflowTurnOptions {
  readonly applicationStagePlan?: ApplicationSkeletonStagePlanController;
  readonly diagramStagePlan?: DiagramModulesStagePlanController;
  readonly eventMessages: ManagedWorkflowTurnEventMessages;
  readonly getMessageDispatch: () => SessionRequestHandlerMessageDispatch;
  readonly qualityGatesStagePlan?: QualityGatesStagePlanController;
  readonly sessionManager: Pick<SessionManager, "getSession">;
}

const persistManagedDecision = async (params: {
  readonly decision:
    | ApplicationSkeletonManagedValidationResult
    | DiagramModulesManagedValidationResult
    | QualityGatesManagedValidationResult;
  readonly schema: string;
  readonly sessionId: string;
  readonly stage:
    | typeof APPLICATION_SKELETON_STAGE
    | typeof DIAGRAM_MODULES_STAGE
    | typeof QUALITY_GATES_STAGE;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const relativePath = `.codeai-hub/${params.workspaceSlug}/workflow/managed/${params.stage}.json`;
  const absolutePath = path.join(params.workspaceRoot, relativePath);
  const snapshot = {
    schema: params.schema,
    stage: params.stage,
    sessionId: params.sessionId,
    updatedAt: new Date().toISOString(),
    ...params.decision,
    diagnostics: undefined,
    nextPrompt: undefined,
  };
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(snapshot, null, 2)}\n`);
};

const resolveMaterializationRepairAttemptNumber = (
  taskId: string | null
): number => {
  const match = taskId?.match(
    APPLICATION_SKELETON_MATERIALIZATION_REPAIR_TASK_RE
  );
  const value = Number(match?.[1]);
  return Number.isInteger(value) && value > 0 ? value : 1;
};

const resolveQualityGatesIntegrationRepairAttemptNumber = (
  taskId: string | null
): number => {
  const match = taskId?.match(QUALITY_GATES_INTEGRATION_REPAIR_TASK_RE);
  const value = Number(match?.[1]);
  return Number.isInteger(value) && value > 0 ? value : 1;
};

const resolveDiagramModulesRepairAttemptNumber = (
  taskId: string | null
): number => parseDiagramModulesRepairTaskNumber(taskId ?? "") ?? 1;

export class SessionRequestHandlerManagedWorkflowTurn {
  private readonly applicationStagePlan: ApplicationSkeletonStagePlanController;
  private readonly diagramStagePlan: DiagramModulesStagePlanController;
  private readonly options: SessionRequestHandlerManagedWorkflowTurnOptions;
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

  async handleTurnCompleted(sessionId: string): Promise<void> {
    const session = this.options.sessionManager.getSession(sessionId) as
      | ManagedWorkflowTurnSession
      | null
      | undefined;
    if (!(session?.workspacePath && session.initiativeSlug && session.stage)) {
      return;
    }
    if (session.stage === DESCRIPTION_STAGE) {
      this.appendCoreMessage(sessionId, {
        content: buildManagedUserLedReviewHandoffMessage("Description"),
        tag: "managed-workflow-user-review",
      });
      return;
    }
    if (session.stage === VIRTUAL_SIMULATION_STAGE) {
      this.appendCoreMessage(sessionId, {
        content: buildManagedUserLedReviewHandoffMessage("Virtual Simulation"),
        tag: "managed-workflow-user-review",
      });
      return;
    }
    if (session.stage === DIAGRAM_MODULES_STAGE) {
      await this.handleDiagramModulesTurn({
        sessionId,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
      return;
    }
    if (session.stage === APPLICATION_SKELETON_STAGE) {
      await this.handleApplicationSkeletonTurn({
        sessionId,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
      return;
    }
    if (session.stage === QUALITY_GATES_STAGE) {
      await this.handleQualityGatesTurn({
        sessionId,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
    }
  }

  private async handleDiagramModulesTurn(params: {
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const decision = await validateDiagramModulesManagedArtifacts(params);
    await persistManagedDecision({
      decision,
      schema: "codeai-managed-workflow-diagram-modules-v1",
      sessionId: params.sessionId,
      stage: DIAGRAM_MODULES_STAGE,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const messageDispatch = this.options.getMessageDispatch();
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
        return;
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
      await messageDispatch.sendInternalMessage(params.sessionId, repairPrompt);
      return;
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
      return;
    }
    if (decision.nextAction === "dispatch_next_product_part") {
      this.appendCoreMessage(params.sessionId, {
        content: buildDiagramModulesManagedContinuationMessage(
          decision.currentPartId
        ),
        tag: "managed-workflow-continuation",
      });
      if (decision.nextPrompt) {
        await messageDispatch.sendInternalMessage(
          params.sessionId,
          decision.nextPrompt
        );
      }
      return;
    }
    if (decision.nextAction === "open_user_review") {
      this.appendCoreMessage(params.sessionId, {
        content: buildManagedUserLedReviewHandoffMessage("Diagram Modules"),
        tag: "managed-workflow-user-review",
      });
    }
  }

  private async handleApplicationSkeletonTurn(params: {
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
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
        return;
      }
      await this.dispatchApplicationRepairPrompt(params, decision, {
        rejectedCommitHash: planAdvance.commit.hash,
        repairTaskId: planAdvance.commit.nextTaskId,
      });
      return;
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
      return;
    }
    if (decision.nextAction === "open_user_review") {
      this.appendCoreMessage(params.sessionId, {
        content: buildManagedUserLedReviewHandoffMessage(
          "Application Skeleton"
        ),
        tag: "managed-workflow-user-review",
      });
      return;
    }
    if (decision.nextAction === "open_persistent_return") {
      this.appendCoreMessage(params.sessionId, {
        content: buildManagedUserLedReviewHandoffMessage(
          "Application Skeleton"
        ),
        tag: "managed-workflow-user-review",
      });
    }
  }

  private async dispatchApplicationRepairPrompt(
    params: {
      readonly sessionId: string;
      readonly workspaceSlug: string;
    },
    decision: ApplicationSkeletonManagedValidationResult,
    rejected: {
      readonly rejectedCommitHash: string;
      readonly repairTaskId: string | null;
    } | null
  ): Promise<void> {
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
      content: repairPrompt,
      tag: "managed-workflow-validation",
    });
    await this.options
      .getMessageDispatch()
      .sendInternalMessage(params.sessionId, repairPrompt);
  }

  private async handleQualityGatesTurn(params: {
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
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
        return;
      }
      await this.dispatchQualityGatesRepairPrompt(params, decision, {
        rejectedCommitHash: planAdvance.commit.hash,
        repairTaskId: planAdvance.commit.nextTaskId,
      });
      return;
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
      return;
    }
    const completesStage = decision.nextAction === "open_persistent_return";
    if (decision.nextAction !== "open_user_review" && !completesStage) {
      return;
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
    }
  }

  private async dispatchQualityGatesRepairPrompt(
    params: {
      readonly sessionId: string;
      readonly workspaceSlug: string;
    },
    decision: QualityGatesManagedValidationResult,
    rejected: {
      readonly rejectedCommitHash: string;
      readonly repairTaskId: string | null;
    } | null
  ): Promise<void> {
    const repairPrompt =
      decision.nextAction === "repair_integration"
        ? buildQualityGatesIntegrationRepairPrompt({
            attemptNumber: resolveQualityGatesIntegrationRepairAttemptNumber(
              rejected?.repairTaskId ?? null
            ),
            diagnostics: decision.diagnostics,
            rejectedCommitHash: rejected?.rejectedCommitHash ?? null,
            workspaceSlug: params.workspaceSlug,
          })
        : (decision.nextPrompt ??
          buildQualityGatesDraftRepairPrompt({
            diagnostics: decision.diagnostics,
            workspaceSlug: params.workspaceSlug,
          }));
    this.appendCoreMessage(params.sessionId, {
      content: repairPrompt,
      tag: "managed-workflow-validation",
    });
    await this.options
      .getMessageDispatch()
      .sendInternalMessage(params.sessionId, repairPrompt);
  }

  private appendCoreMessage(
    sessionId: string,
    payload: { readonly content: string; readonly tag: string }
  ): void {
    this.options.eventMessages.appendCoreMessage(sessionId, payload);
  }
}
