import { readFile } from "node:fs/promises";
import path from "node:path";
import { ApplicationSkeletonCoreMaterializer } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer";
import {
  buildApplicationSkeletonBoundaryBlockedMessage,
  buildApplicationSkeletonMaterializationRevisionPrompt,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder";
import {
  buildApplicationSkeletonReviewRevisionPrompt,
  classifyApplicationSkeletonReviewIntent,
  isApplicationSkeletonReviewOpen,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-review-intent";
import { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import {
  APPLICATION_STAGE_PLAN_PATH,
  PHASE4_TASK_ID,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-model";
import { validateApplicationSkeletonManagedArtifacts } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-validator";
import {
  acceptDiagramModulesReviewWithoutRevision,
  isDiagramModulesReviewOpen,
} from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance";
import {
  buildApplicationSkeletonReviewHandoffMessage,
  buildManagedPersistentReturnHandoffMessage,
} from "../../managed-workflow-orchestration/managed-workflow-user-handoff-messages";
import { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import {
  PLAN_END,
  PLAN_START,
  REVIEW_TASK_PREFIX as QUALITY_GATES_REVIEW_TASK_PREFIX,
  QUALITY_GATES_STAGE_PLAN_PATH,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model";
import type { Session } from "../../session-manager";
import { WorkflowStepCommitFacade } from "../../workflow/boundary/workflow-step-commit-facade";
import { persistApplicationSkeletonManagedDecision } from "./application-skeleton-managed-decision-persister";
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
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage" | "appendDialogMessage" | "waitForMessagePersistence"
  >;
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
const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const NEGATED_ACCEPT_RE =
  /(?:\b(?:do\s+not|don't|not)\s+(?:accept|approve|confirm)\b|(?:^|[\s,.;:!?])(?:не|не\s+надо|не\s+нужно)\s+(?:подтверждаю|п[іi]дтверджую)(?:$|[\s,.;:!?]))/iu;

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

const isQualityGatesReviewOpen = async (
  workspaceRoot: string
): Promise<boolean> => {
  const planText = await readFile(
    path.join(workspaceRoot, QUALITY_GATES_STAGE_PLAN_PATH),
    "utf8"
  ).catch(() => null);
  if (!planText) {
    return false;
  }
  const json = planText
    .split(PLAN_START)[1]
    ?.split(PLAN_END)[0]
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    return false;
  }
  try {
    const state = JSON.parse(json) as { readonly currentTaskId?: unknown };
    return (
      typeof state.currentTaskId === "string" &&
      state.currentTaskId.startsWith(QUALITY_GATES_REVIEW_TASK_PREFIX)
    );
  } catch {
    return false;
  }
};

const readApplicationSkeletonTaskId = async (
  workspaceRoot: string
): Promise<string | null> => {
  const planText = await readFile(
    path.join(workspaceRoot, APPLICATION_STAGE_PLAN_PATH),
    "utf8"
  ).catch(() => null);
  if (!planText) {
    return null;
  }
  const json = planText
    .split(PLAN_START)[1]
    ?.split(PLAN_END)[0]
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    return null;
  }
  try {
    const state = JSON.parse(json) as { readonly currentTaskId?: unknown };
    return typeof state.currentTaskId === "string" ? state.currentTaskId : null;
  } catch {
    return null;
  }
};

export class SessionRequestHandlerManagedReviewDecisions {
  private readonly applicationSkeletonStagePlan =
    new ApplicationSkeletonStagePlanController();
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
    if (await this.preliminaryReviewCommitter.handle(options)) {
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
        intent: classifyManagedReviewIntent(options.content),
      })
    ) {
      return true;
    }
    return this.handleQualityGatesReviewDecision({
      ...options,
      intent: classifyManagedReviewIntent(options.content),
    });
  }

  private async handleApplicationSkeletonReviewDecision(
    options: ManagedReviewDecisionOptions & {
      readonly intent: ManagedReviewIntent;
    }
  ): Promise<boolean> {
    if (
      !(
        options.session.stage === APPLICATION_SKELETON_STAGE &&
        options.session.workspacePath &&
        options.session.initiativeSlug
      )
    ) {
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
    if (
      !(
        options.session.stage === DIAGRAM_MODULES_STAGE &&
        options.session.workspacePath &&
        options.session.initiativeSlug
      )
    ) {
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
    if (
      !(
        options.session.stage === QUALITY_GATES_STAGE &&
        options.session.workspacePath &&
        options.session.initiativeSlug
      )
    ) {
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
    try {
      await this.applicationSkeletonStagePlan.acceptUserReviewWithoutRevision({
        workspaceRoot: session.workspacePath,
      });
    } catch (error) {
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: buildApplicationSkeletonBoundaryBlockedMessage(
          error instanceof Error ? error.message : String(error)
        ),
        tag: "managed-workflow-validation",
      });
      return;
    }
    await this.applicationSkeletonMaterializer.materialize({
      workspaceRoot: session.workspacePath,
      workspaceSlug: session.initiativeSlug,
    });
    const decision = await validateApplicationSkeletonManagedArtifacts({
      workspaceRoot: session.workspacePath,
      workspaceSlug: session.initiativeSlug,
    });
    await persistApplicationSkeletonManagedDecision({ decision, session });
    if (!decision.valid) {
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: [
          "Core-owned Application Skeleton materialization failed validation.",
          "Diagnostics:",
          ...decision.diagnostics.map((diagnostic) => `- ${diagnostic}`),
        ].join("\n"),
        tag: "managed-workflow-validation",
      });
      return;
    }
    const planAdvance =
      await this.applicationSkeletonStagePlan.commitManagedTurn({
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
      return;
    }
    this.deps.eventMessages.appendCoreMessage(session.id, {
      content: buildApplicationSkeletonReviewHandoffMessage(
        "materialized_skeleton"
      ),
      tag: "managed-workflow-user-review",
    });
  }

  private async completeApplicationSkeletonFinalReview(
    session: Session
  ): Promise<void> {
    if (!session.workspacePath) {
      return;
    }
    try {
      await this.applicationSkeletonStagePlan.acceptFinalMaterializedReview({
        workspaceRoot: session.workspacePath,
      });
    } catch (error) {
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: buildApplicationSkeletonBoundaryBlockedMessage(
          error instanceof Error ? error.message : String(error)
        ),
        tag: "managed-workflow-validation",
      });
      return;
    }
    this.deps.broadcaster({
      payload: { stage: QUALITY_GATES_STAGE },
      type: "workflow:stage:activate",
    });
  }

  private async acceptApplicationSkeletonReview(
    session: Session,
    phase: ApplicationSkeletonReviewPhase
  ): Promise<void> {
    if (phase === "draft") {
      await this.openApplicationSkeletonMaterialization(session);
      return;
    }
    await this.completeApplicationSkeletonFinalReview(session);
  }

  private async completeDiagramModulesReview(session: Session): Promise<void> {
    if (!(session.workspacePath && session.initiativeSlug)) {
      return;
    }
    try {
      await acceptDiagramModulesReviewWithoutRevision({
        workspaceRoot: session.workspacePath,
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
