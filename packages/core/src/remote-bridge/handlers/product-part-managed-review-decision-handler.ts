import {
  ClusterContractAgentBootstrapper,
  type ClusterContractAgentBootstrapRequest,
  type ClusterContractAgentBootstrapResult,
  type ClusterContractAgentSessionGateway,
} from "../../development-tree/node-bootstrap/cluster-contract-agent-bootstrapper";
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

interface ClusterWaveBootstrapperLike {
  readonly bootstrapFirstWave: (
    request: ClusterContractAgentBootstrapRequest
  ) => Promise<readonly ClusterContractAgentBootstrapResult[]>;
}

interface FirstWaveSignal {
  readonly startFirstWave?: { readonly partId: string };
}

interface ProductPartManagedReviewDecisionDeps {
  readonly createClusterWaveBootstrapper?: (
    session: ProductPartReviewSession
  ) => ClusterWaveBootstrapperLike;
  readonly developmentTreeAgentGateway?: ClusterContractAgentSessionGateway;
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

const buildClusterWaveStartedMessage = (
  results: readonly ClusterContractAgentBootstrapResult[]
): string =>
  [
    "Core: первая cluster-contract wave запущена по accepted Development Order Plan.",
    ...results.map(
      (result) =>
        `- cluster \`${result.clusterId}\`: session \`${result.sessionId ?? "not-created"}\`, worktree \`${result.worktreePath}\`, first prompt ${result.firstMessageSent ? "sent" : "not-sent"}.`
    ),
  ].join("\n");

const startFirstClusterWave = async (
  deps: ProductPartManagedReviewDecisionDeps,
  session: ProductPartReviewSession,
  partId: string
): Promise<void> => {
  const gateway = deps.developmentTreeAgentGateway;
  if (!gateway) {
    deps.eventMessages.appendCoreMessage(session.id, {
      content:
        "Core: first cluster-contract wave cannot start because the Development Tree agent gateway is unavailable.",
      tag: "managed-workflow-validation",
    });
    return;
  }
  const bootstrapper =
    deps.createClusterWaveBootstrapper?.(session) ??
    new ClusterContractAgentBootstrapper({
      gateway,
      providerId: session.providerId,
    });
  const results = await bootstrapper.bootstrapFirstWave({
    inheritedModelBinding: session.modelBinding ?? null,
    partId,
    workspaceRoot: session.workspacePath,
    workspaceSlug: session.initiativeSlug,
  });
  deps.eventMessages.appendCoreMessage(session.id, {
    content: buildClusterWaveStartedMessage(results),
    tag: "managed-workflow-assignment",
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
  if (result.nextInternalMessage) {
    await deps.messageDispatch.sendInternalMessage(
      options.sessionId,
      result.nextInternalMessage
    );
  }
  const firstWave = (result as typeof result & FirstWaveSignal).startFirstWave;
  if (firstWave) {
    await startFirstClusterWave(deps, options.session, firstWave.partId);
  }
  return true;
};
