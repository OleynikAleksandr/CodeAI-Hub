import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import { ApplicationSkeletonCoreMaterializer } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer";
import {
  buildApplicationSkeletonBoundaryBlockedMessage,
  buildApplicationSkeletonMaterializationRepairPrompt,
  buildApplicationSkeletonMaterializationRevisionPrompt,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder";
import {
  buildApplicationSkeletonReviewRevisionPrompt,
  classifyApplicationSkeletonReviewIntent,
  isApplicationSkeletonReviewOpen,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-review-intent";
import { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import { PHASE4_TASK_ID } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-model";
import { parseMaterializationRepairTaskNumber } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-repair-model";
import { validateApplicationSkeletonManagedArtifacts } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-validator";
import {
  acceptDiagramModulesReviewWithoutRevision,
  commitDiagramModulesDevelopmentTreeBootstrap,
  isDiagramModulesReviewOpen,
} from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance";
import { buildManagedPersistentReturnHandoffMessage } from "../../managed-workflow-orchestration/managed-workflow-user-handoff-messages";
import { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { Session } from "../../session-manager";
import { WorkflowStepCommitFacade } from "../../workflow/boundary/workflow-step-commit-facade";
import { completeApplicationSkeletonMaterializedHandoff } from "./application-skeleton-completion-handoff";
import { persistApplicationSkeletonManagedDecision } from "./application-skeleton-managed-decision-persister";
import { handleClusterContractManagedReviewDecision } from "./cluster-contract-review-controller";
import { DevelopmentTreeProductPartPrecodeBootstrap } from "./development-tree-product-part-precode-bootstrap";
import {
  buildDevelopmentTreeTurnFailureMessage,
  runGuardedDevelopmentTreeTurn,
} from "./development-tree-turn-guard";
import {
  isQualityGatesReviewOpen,
  readApplicationSkeletonTaskId,
} from "./managed-review-state-readers";
import { handleManagedStageRepairLimitReviewDecision } from "./managed-stage-repair-limit-review";
import { handleProductPartManagedReviewDecision } from "./product-part-managed-review-decision-handler";
import {
  dispatchQualityGatesReviewRevision,
  openQualityGatesNextAcceptedReviewPhase,
} from "./quality-gates-review-decision-flow";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";
import type { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";
import { SessionRequestHandlerPreliminaryReviewCommitter } from "./session-request-handler-preliminary-review-committer";

type ManagedReviewIntent = "accept" | "none" | "revision";
type ApplicationSkeletonReviewPhase = "draft" | "final";
interface ManagedReviewDecisionOptions {
  readonly content: string;
  readonly hiddenUserMessage: boolean;
  readonly session: Session;
  readonly sessionId: string;
}
interface ManagedReviewDecisionDeps {
  readonly broadcaster: (event: unknown) => void;
  readonly developmentTreeAgentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage" | "appendDialogMessage" | "waitForMessagePersistence"
  >;
  readonly managedInputGate?: {
    readonly lock: (sessionId: string) => boolean;
    readonly release: (sessionId: string) => void;
  };
  readonly messageDispatch: Pick<
    SessionRequestHandlerMessageDispatch,
    "sendInternalMessage"
  >;
}
const APPLICATION_SKELETON_STAGE = "application_skeleton";
const DIAGRAM_MODULES_STAGE = "diagram_modules";
const QUALITY_GATES_STAGE = "quality_gates";
const ACCEPT_RE =
  /(?:\b(?:accept(?:ed)?|approv(?:e|ed)|confirm(?:ed)?|ok(?:ay)?)\b|(?:^|[\s,.;:!?])(?:п[іi]дтверджую|подтверждаю)(?:$|[\s,.;:!?]))/iu;
const NEGATED_ACCEPT_RE =
  /(?:\b(?:do\s+not|don't|not)\s+(?:accept|approve|confirm)\b|(?:^|[\s,.;:!?])(?:не|не\s+надо|не\s+нужно)\s+(?:подтверждаю|п[іi]дтверджую)(?:$|[\s,.;:!?]))/iu;
const hasManagedStageSession = (session: Session, stage: string): boolean =>
  session.stage === stage &&
  Boolean(session.workspacePath && session.initiativeSlug);
const classifyManagedReviewIntent = (content: string): ManagedReviewIntent => {
  const normalized = content.trim();
  if (!normalized) {
    return "none";
  }
  if (NEGATED_ACCEPT_RE.test(normalized)) {
    return "revision";
  }
  if (ACCEPT_RE.test(normalized)) {
    return "accept";
  }
  return "revision";
};
export class SessionRequestHandlerManagedReviewDecisions {
  private readonly appStagePlan = new ApplicationSkeletonStagePlanController();
  private readonly applicationSkeletonMaterializer =
    new ApplicationSkeletonCoreMaterializer();
  private readonly deps: ManagedReviewDecisionDeps;
  private readonly preliminaryReviewCommitter: SessionRequestHandlerPreliminaryReviewCommitter;
  private readonly qualityGatesStagePlan =
    new QualityGatesStagePlanController();
  private readonly stepCommitFacade = new WorkflowStepCommitFacade();
  constructor(deps: ManagedReviewDecisionDeps) {
    this.deps = deps;
    this.preliminaryReviewCommitter =
      new SessionRequestHandlerPreliminaryReviewCommitter({
        broadcaster: (event) => deps.broadcaster(event),
        eventMessages: deps.eventMessages,
      });
  }
  async handleReviewDecision(
    options: ManagedReviewDecisionOptions
  ): Promise<boolean> {
    const managedIntent = classifyManagedReviewIntent(options.content);
    if (await this.preliminaryReviewCommitter.handle(options)) {
      return true;
    }
    if (
      await handleManagedStageRepairLimitReviewDecision({
        content: options.content,
        deps: {
          developmentTreeAgentGateway: this.deps.developmentTreeAgentGateway,
          eventMessages: this.deps.eventMessages,
          messageDispatch: this.deps.messageDispatch,
          qualityGatesStagePlan: this.qualityGatesStagePlan,
        },
        hiddenUserMessage: options.hiddenUserMessage,
        intent: managedIntent,
        session: options.session,
      })
    ) {
      return true;
    }
    if (
      await this.handleApplicationSkeletonReviewDecision({
        ...options,
        intent: classifyApplicationSkeletonReviewIntent(options.content),
      })
    ) {
      return true;
    }
    if (
      await this.handleDiagramModulesReviewDecision({
        ...options,
        intent: managedIntent,
      })
    ) {
      return true;
    }
    const reportDevelopmentTreeReviewFailure = (error: unknown): boolean => {
      this.deps.eventMessages.appendCoreMessage(
        options.session.id,
        buildDevelopmentTreeTurnFailureMessage(error)
      );
      return true;
    };
    if (
      await runGuardedDevelopmentTreeTurn(
        () =>
          handleClusterContractManagedReviewDecision({
            eventMessages: this.deps.eventMessages,
            intent: managedIntent,
            messageDispatch: this.deps.messageDispatch,
            options,
          }),
        reportDevelopmentTreeReviewFailure
      )
    ) {
      return true;
    }
    if (
      await runGuardedDevelopmentTreeTurn(
        () =>
          handleProductPartManagedReviewDecision({
            eventMessages: this.deps.eventMessages,
            intent: managedIntent,
            messageDispatch: this.deps.messageDispatch,
            options,
          }),
        reportDevelopmentTreeReviewFailure
      )
    ) {
      return true;
    }
    return this.handleQualityGatesReviewDecision({
      ...options,
      intent: managedIntent,
    });
  }
  private async handleApplicationSkeletonReviewDecision(
    options: ManagedReviewDecisionOptions & {
      readonly intent: ManagedReviewIntent;
    }
  ): Promise<boolean> {
    if (!hasManagedStageSession(options.session, APPLICATION_SKELETON_STAGE)) {
      return false;
    }
    const phase = await this.resolveApplicationSkeletonReviewPhase(
      options.session.workspacePath
    );
    if (!phase) {
      return false;
    }
    if (options.intent === "none") {
      return false;
    }
    this.appendUserReviewMessage(options);
    if (options.intent === "accept") {
      await this.acceptApplicationSkeletonReview(options.session, phase);
      return true;
    }
    await this.dispatchApplicationSkeletonReviewRevision(
      options.session,
      options.content,
      phase
    );
    return true;
  }
  private async resolveApplicationSkeletonReviewPhase(
    workspaceRoot: string
  ): Promise<ApplicationSkeletonReviewPhase | null> {
    if (await isApplicationSkeletonReviewOpen(workspaceRoot)) {
      return "draft";
    }
    return (await readApplicationSkeletonTaskId(workspaceRoot)) ===
      PHASE4_TASK_ID
      ? "final"
      : null;
  }
  private async handleDiagramModulesReviewDecision(
    options: ManagedReviewDecisionOptions & {
      readonly intent: ManagedReviewIntent;
    }
  ): Promise<boolean> {
    if (!hasManagedStageSession(options.session, DIAGRAM_MODULES_STAGE)) {
      return false;
    }
    if (!(await isDiagramModulesReviewOpen(options.session.workspacePath))) {
      return false;
    }
    if (options.intent !== "accept") {
      return false;
    }
    this.appendUserReviewMessage(options);
    await this.completeDiagramModulesReview(options.session);
    return true;
  }
  private async handleQualityGatesReviewDecision(
    options: ManagedReviewDecisionOptions & {
      readonly intent: ManagedReviewIntent;
    }
  ): Promise<boolean> {
    if (!hasManagedStageSession(options.session, QUALITY_GATES_STAGE)) {
      return false;
    }
    if (!(await isQualityGatesReviewOpen(options.session.workspacePath))) {
      return false;
    }
    if (options.intent === "none") {
      return false;
    }
    this.appendUserReviewMessage(options);
    if (options.intent === "accept") {
      await openQualityGatesNextAcceptedReviewPhase(options.session, {
        eventMessages: this.deps.eventMessages,
        messageDispatch: this.deps.messageDispatch,
        stagePlan: this.qualityGatesStagePlan,
      });
      return true;
    }
    await dispatchQualityGatesReviewRevision(options.session, options.content, {
      eventMessages: this.deps.eventMessages,
      messageDispatch: this.deps.messageDispatch,
      stagePlan: this.qualityGatesStagePlan,
    });
    return true;
  }
  private appendUserReviewMessage(options: ManagedReviewDecisionOptions): void {
    if (options.hiddenUserMessage) {
      return;
    }
    this.deps.eventMessages.appendDialogMessage(options.sessionId, {
      content: options.content,
      role: "user",
    });
  }
  private async openApplicationSkeletonMaterialization(
    session: Session
  ): Promise<void> {
    if (!(session.workspacePath && session.initiativeSlug)) {
      return;
    }
    const gateLocked = this.deps.managedInputGate?.lock(session.id) ?? false;
    const releaseGate = (): void => {
      if (gateLocked) {
        this.deps.managedInputGate?.release(session.id);
      }
    };
    try {
      await this.appStagePlan.acceptUserReviewWithoutRevision({
        workspaceRoot: session.workspacePath,
      });
    } catch (error) {
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: buildApplicationSkeletonBoundaryBlockedMessage(
          error instanceof Error ? error.message : String(error)
        ),
        tag: "managed-workflow-validation",
      });
      releaseGate();
      return;
    }
    try {
      await this.applicationSkeletonMaterializer.materialize({
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
    } catch (error) {
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: buildApplicationSkeletonBoundaryBlockedMessage(
          error instanceof Error ? error.message : String(error)
        ),
        tag: "managed-workflow-validation",
      });
      releaseGate();
      return;
    }
    const decision = await validateApplicationSkeletonManagedArtifacts({
      workspaceRoot: session.workspacePath,
      workspaceSlug: session.initiativeSlug,
    });
    if (!decision.valid) {
      const failedMap =
        await this.applicationSkeletonMaterializer.markMaterializationFailed({
          diagnostics: decision.diagnostics,
          workspaceRoot: session.workspacePath,
          workspaceSlug: session.initiativeSlug,
        });
      const failedDecision = { ...decision, mapJson: failedMap };
      await persistApplicationSkeletonManagedDecision({
        decision: failedDecision,
        session,
      });
      const planAdvance = await this.appStagePlan.commitRejectedTurn({
        decision: failedDecision,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
      if (planAdvance.blocked) {
        this.deps.eventMessages.appendCoreMessage(session.id, {
          content: buildApplicationSkeletonBoundaryBlockedMessage(
            planAdvance.blocked.message
          ),
          tag: "managed-workflow-validation",
        });
        releaseGate();
        return;
      }
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: [
          "Core обнаружил ошибку материализации Application Skeleton.",
          "Repair prompt отправлен агенту внутренним сообщением.",
        ].join("\n"),
        tag: "managed-workflow-validation",
      });
      await this.deps.messageDispatch.sendInternalMessage(
        session.id,
        buildApplicationSkeletonMaterializationRepairPrompt({
          attemptNumber:
            parseMaterializationRepairTaskNumber(
              planAdvance.commit.nextTaskId ?? ""
            ) ?? 1,
          diagnostics: decision.diagnostics,
          rejectedCommitHash: planAdvance.commit.hash,
          workspaceSlug: session.initiativeSlug,
        })
      );
      return;
    }
    await persistApplicationSkeletonManagedDecision({ decision, session });
    const planAdvance = await this.appStagePlan.commitManagedTurn({
      decision,
      sessionId: session.id,
      workspaceRoot: session.workspacePath,
      workspaceSlug: session.initiativeSlug,
    });
    if (planAdvance.blocked) {
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: buildApplicationSkeletonBoundaryBlockedMessage(
          planAdvance.blocked.message
        ),
        tag: "managed-workflow-validation",
      });
      releaseGate();
      return;
    }
    if (session.workspacePath) {
      await completeApplicationSkeletonMaterializedHandoff({
        broadcaster: this.deps.broadcaster,
        eventMessages: this.deps.eventMessages,
        sessionId: session.id,
        stagePlan: this.appStagePlan,
        workspaceRoot: session.workspacePath,
      });
    }
    releaseGate();
  }
  private async acceptApplicationSkeletonReview(
    session: Session,
    phase: ApplicationSkeletonReviewPhase
  ): Promise<void> {
    if (phase === "draft") {
      await this.openApplicationSkeletonMaterialization(session);
      return;
    }
    if (!session.workspacePath) {
      return;
    }
    await completeApplicationSkeletonMaterializedHandoff({
      broadcaster: this.deps.broadcaster,
      eventMessages: this.deps.eventMessages,
      sessionId: session.id,
      stagePlan: this.appStagePlan,
      workspaceRoot: session.workspacePath,
    });
  }
  private async completeDiagramModulesReview(session: Session): Promise<void> {
    if (!(session.workspacePath && session.initiativeSlug)) {
      return;
    }
    try {
      await acceptDiagramModulesReviewWithoutRevision({
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: buildManagedPersistentReturnHandoffMessage("Diagram Modules"),
        tag: "managed-workflow-complete",
      });
      await this.deps.eventMessages.waitForMessagePersistence(session.id);
      await this.stepCommitFacade.commitAcceptedStep({
        sessions: [
          {
            providerId: session.providerId,
            providerSessionId: session.providerSessionId,
          },
        ],
        stage: DIAGRAM_MODULES_STAGE,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
      await new DevelopmentTreeProductPartPrecodeBootstrap().bootstrap({
        agentGateway: this.deps.developmentTreeAgentGateway,
        committer: {
          commitDevelopmentTreeBootstrap:
            commitDiagramModulesDevelopmentTreeBootstrap,
        },
        providerId: session.providerId,
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
      this.deps.broadcaster({
        payload: { stage: APPLICATION_SKELETON_STAGE },
        type: "workflow:stage:activate",
      });
    } catch (error) {
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: `Core validation blocked Diagram Modules review completion:\n${
          error instanceof Error ? error.message : String(error)
        }`,
        tag: "managed-workflow-validation",
      });
      return;
    }
  }
  private async dispatchApplicationSkeletonReviewRevision(
    session: Session,
    content: string,
    phase: ApplicationSkeletonReviewPhase
  ): Promise<void> {
    if (!session.initiativeSlug) {
      return;
    }
    const prompt =
      phase === "draft"
        ? buildApplicationSkeletonReviewRevisionPrompt({
            userFeedback: content,
            workspaceSlug: session.initiativeSlug,
          })
        : buildApplicationSkeletonMaterializationRevisionPrompt({
            userFeedback: content,
            workspaceSlug: session.initiativeSlug,
          });
    await this.deps.messageDispatch.sendInternalMessage(session.id, prompt);
  }
}
