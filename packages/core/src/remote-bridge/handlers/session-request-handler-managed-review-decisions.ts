import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildApplicationSkeletonBoundaryBlockedMessage,
  buildApplicationSkeletonMaterializationPrompt,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder";
import {
  buildApplicationSkeletonReviewRevisionPrompt,
  classifyApplicationSkeletonReviewIntent,
  isApplicationSkeletonReviewOpen,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-review-intent";
import { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import {
  buildQualityGatesBoundaryBlockedMessage,
  buildQualityGatesIntegrationPrompt,
  buildQualityGatesReviewRevisionPrompt,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder";
import { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import {
  PLAN_END,
  PLAN_START,
  REVIEW_TASK_PREFIX as QUALITY_GATES_REVIEW_TASK_PREFIX,
  QUALITY_GATES_STAGE_PLAN_PATH,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model";
import type { Session } from "../../session-manager";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";
import type { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";

type ManagedReviewIntent = "accept" | "none" | "revision";

interface ManagedReviewDecisionOptions {
  readonly content: string;
  readonly hiddenUserMessage: boolean;
  readonly session: Session;
  readonly sessionId: string;
}

interface ManagedReviewDecisionDeps {
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage" | "appendDialogMessage"
  >;
  readonly messageDispatch: Pick<
    SessionRequestHandlerMessageDispatch,
    "sendInternalMessage"
  >;
}

const APPLICATION_SKELETON_STAGE = "application_skeleton";
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

export class SessionRequestHandlerManagedReviewDecisions {
  private readonly applicationSkeletonStagePlan =
    new ApplicationSkeletonStagePlanController();
  private readonly deps: ManagedReviewDecisionDeps;
  private readonly qualityGatesStagePlan =
    new QualityGatesStagePlanController();

  constructor(deps: ManagedReviewDecisionDeps) {
    this.deps = deps;
  }

  async handleReviewDecision(
    options: ManagedReviewDecisionOptions
  ): Promise<boolean> {
    if (
      await this.handleApplicationSkeletonReviewDecision({
        ...options,
        intent: classifyApplicationSkeletonReviewIntent(options.content),
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
    if (
      !(await isApplicationSkeletonReviewOpen(options.session.workspacePath))
    ) {
      return false;
    }
    if (options.intent === "none") {
      return false;
    }
    this.appendUserReviewMessage(options);
    if (options.intent === "accept") {
      await this.openApplicationSkeletonMaterialization(options.session);
      return true;
    }
    await this.dispatchApplicationSkeletonReviewRevision(
      options.session,
      options.content
    );
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
      await this.openQualityGatesIntegration(options.session);
      return true;
    }
    await this.dispatchQualityGatesReviewRevision(
      options.session,
      options.content
    );
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
    const prompt = buildApplicationSkeletonMaterializationPrompt({
      workspaceSlug: session.initiativeSlug,
    });
    this.deps.eventMessages.appendCoreMessage(session.id, {
      content: prompt,
      tag: "managed-workflow-continuation",
    });
    await this.deps.messageDispatch.sendInternalMessage(session.id, prompt);
  }

  private async openQualityGatesIntegration(session: Session): Promise<void> {
    if (!(session.workspacePath && session.initiativeSlug)) {
      return;
    }
    try {
      await this.qualityGatesStagePlan.acceptUserReviewWithoutRevision({
        workspaceRoot: session.workspacePath,
      });
    } catch (error) {
      this.deps.eventMessages.appendCoreMessage(session.id, {
        content: buildQualityGatesBoundaryBlockedMessage(
          error instanceof Error ? error.message : String(error)
        ),
        tag: "managed-workflow-validation",
      });
      return;
    }
    const prompt = buildQualityGatesIntegrationPrompt({
      workspaceSlug: session.initiativeSlug,
    });
    this.deps.eventMessages.appendCoreMessage(session.id, {
      content: prompt,
      tag: "managed-workflow-continuation",
    });
    await this.deps.messageDispatch.sendInternalMessage(session.id, prompt);
  }

  private async dispatchApplicationSkeletonReviewRevision(
    session: Session,
    content: string
  ): Promise<void> {
    if (!session.initiativeSlug) {
      return;
    }
    const prompt = buildApplicationSkeletonReviewRevisionPrompt({
      userFeedback: content,
      workspaceSlug: session.initiativeSlug,
    });
    await this.deps.messageDispatch.sendInternalMessage(session.id, prompt);
  }

  private async dispatchQualityGatesReviewRevision(
    session: Session,
    content: string
  ): Promise<void> {
    if (!session.initiativeSlug) {
      return;
    }
    const prompt = buildQualityGatesReviewRevisionPrompt({
      userFeedback: content,
      workspaceSlug: session.initiativeSlug,
    });
    this.deps.eventMessages.appendCoreMessage(session.id, {
      content: prompt,
      tag: "managed-workflow-user-review",
    });
    await this.deps.messageDispatch.sendInternalMessage(session.id, prompt);
  }
}
