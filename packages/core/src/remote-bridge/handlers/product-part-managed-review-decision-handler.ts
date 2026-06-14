import type { Session } from "../../session-manager";
import { ProductPartDevelopmentBriefReviewController } from "./product-part-development-brief-review-controller";
import type { SessionRequestHandlerEventMessages } from "./session-request-handler-event-messages";
import type { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";

type ManagedReviewIntent = "accept" | "none" | "revision";
type ProductPartReviewSession = Session &
  Record<"initiativeSlug" | "stage" | "workspacePath", string>;

interface ProductPartManagedReviewDecisionOptions {
  readonly content: string;
  readonly hiddenUserMessage: boolean;
  readonly session: Session;
  readonly sessionId: string;
}

interface ProductPartReviewControllerLike {
  readonly handleAccepted: (params: {
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }) => ReturnType<
    ProductPartDevelopmentBriefReviewController["handleAccepted"]
  >;
}

interface ProductPartManagedReviewDecisionDeps {
  readonly eventMessages: Pick<
    SessionRequestHandlerEventMessages,
    "appendCoreMessage" | "appendDialogMessage"
  >;
  readonly intent: ManagedReviewIntent;
  readonly messageDispatch: Pick<
    SessionRequestHandlerMessageDispatch,
    "sendInternalMessage"
  >;
  readonly options: ProductPartManagedReviewDecisionOptions;
  readonly productPartReview?: ProductPartReviewControllerLike;
}

const PRODUCT_PART_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/[^/]+$/u;

const hasProductPartReviewSession = (
  session: Session
): session is ProductPartReviewSession =>
  Boolean(
    session.stage &&
      PRODUCT_PART_STAGE_RE.test(session.stage) &&
      session.workspacePath &&
      session.initiativeSlug
  );

const appendUserReviewMessage = (
  deps: ProductPartManagedReviewDecisionDeps
): void => {
  if (deps.options.hiddenUserMessage) {
    return;
  }
  deps.eventMessages.appendDialogMessage(deps.options.sessionId, {
    content: deps.options.content,
    role: "user",
  });
};

export const handleProductPartManagedReviewDecision = async (
  deps: ProductPartManagedReviewDecisionDeps
): Promise<boolean> => {
  const { options } = deps;
  if (!hasProductPartReviewSession(options.session)) {
    return false;
  }
  if (deps.intent !== "accept") {
    return false;
  }
  appendUserReviewMessage(deps);
  const result = await (
    deps.productPartReview ?? new ProductPartDevelopmentBriefReviewController()
  ).handleAccepted({
    sessionId: options.sessionId,
    stage: options.session.stage,
    workspaceRoot: options.session.workspacePath,
    workspaceSlug: options.session.initiativeSlug,
  });
  if (!result.handled) {
    return false;
  }
  deps.eventMessages.appendCoreMessage(options.sessionId, result.message);
  if (result.targetCoreMessage) {
    deps.eventMessages.appendCoreMessage(result.targetCoreMessage.sessionId, {
      content: result.targetCoreMessage.content,
      tag: result.targetCoreMessage.tag,
    });
  }
  if (result.nextInternalMessage) {
    await deps.messageDispatch.sendInternalMessage(
      options.sessionId,
      result.nextInternalMessage
    );
  }
  return true;
};
