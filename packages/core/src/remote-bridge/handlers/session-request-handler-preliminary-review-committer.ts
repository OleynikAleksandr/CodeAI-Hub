import { buildManagedPersistentReturnHandoffMessage } from "../../managed-workflow-orchestration/managed-workflow-user-handoff-messages";
import type { Session } from "../../session-manager";
import { WorkflowStepCommitFacade } from "../../workflow/boundary/workflow-step-commit-facade";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";

type PreliminaryStageLabel = "Description" | "Virtual Simulation";
type PreliminaryStageId = "description" | "virtual_simulation";

interface PreliminaryReviewCommitOptions {
  readonly content: string;
  readonly hiddenUserMessage: boolean;
  readonly session: Session;
  readonly sessionId: string;
}

interface PreliminaryReviewCommitterDeps {
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage" | "appendDialogMessage"
  >;
  readonly stepCommitFacade?: Pick<
    WorkflowStepCommitFacade,
    "commitAcceptedStep"
  >;
}

const EXACT_ACCEPT_RE =
  /^(?:accept(?:ed)?|approv(?:e|ed)|confirm(?:ed)?|ok(?:ay)?|п[іi]дтверджую|подтверждаю)[\s.!?]*$/iu;

const resolvePreliminaryStage = (
  stage: string | null
): {
  readonly label: PreliminaryStageLabel;
  readonly stage: PreliminaryStageId;
} | null => {
  if (stage === "description") {
    return { label: "Description", stage };
  }
  return stage === "virtual_simulation"
    ? { label: "Virtual Simulation", stage }
    : null;
};

const hasOpenPreliminaryReviewGate = (
  session: Session,
  stageLabel: PreliminaryStageLabel
): boolean => {
  const prefix = `Core: ${stageLabel} перешёл в пользовательскую проверку.`;
  return session.messages.some(
    (message) =>
      message.role === "system" &&
      message.tag === "managed-workflow-user-review" &&
      message.content.startsWith(prefix)
  );
};

const formatCommitBlockedMessage = (error: unknown): string =>
  [
    "Core could not commit the accepted preliminary workflow step.",
    "The next workflow step remains blocked because Git must be clean first.",
    "",
    error instanceof Error ? error.message : String(error),
  ].join("\n");

export class SessionRequestHandlerPreliminaryReviewCommitter {
  readonly #deps: PreliminaryReviewCommitterDeps;
  readonly #stepCommitFacade: Pick<
    WorkflowStepCommitFacade,
    "commitAcceptedStep"
  >;

  constructor(deps: PreliminaryReviewCommitterDeps) {
    this.#deps = deps;
    this.#stepCommitFacade =
      deps.stepCommitFacade ?? new WorkflowStepCommitFacade();
  }

  async handle(options: PreliminaryReviewCommitOptions): Promise<boolean> {
    const stage = resolvePreliminaryStage(options.session.stage);
    if (!stage) {
      return false;
    }
    if (!EXACT_ACCEPT_RE.test(options.content.trim())) {
      return false;
    }
    if (!hasOpenPreliminaryReviewGate(options.session, stage.label)) {
      return false;
    }
    this.appendUserReviewMessage(options);
    if (options.session.workspacePath && options.session.initiativeSlug) {
      try {
        await this.#stepCommitFacade.commitAcceptedStep({
          sessions: [options.session],
          stage: stage.stage,
          workspaceRoot: options.session.workspacePath,
          workspaceSlug: options.session.initiativeSlug,
        });
      } catch (error) {
        this.#deps.eventMessages.appendCoreMessage(options.sessionId, {
          content: formatCommitBlockedMessage(error),
          tag: "managed-workflow-validation",
        });
        return true;
      }
    }
    this.#deps.eventMessages.appendCoreMessage(options.sessionId, {
      content: buildManagedPersistentReturnHandoffMessage(stage.label),
      tag: "managed-workflow-complete",
    });
    return true;
  }

  private appendUserReviewMessage(
    options: PreliminaryReviewCommitOptions
  ): void {
    if (options.hiddenUserMessage) {
      return;
    }
    this.#deps.eventMessages.appendDialogMessage(options.sessionId, {
      content: options.content,
      role: "user",
    });
  }
}
