import type { FlowNodeContinuityFacade } from "../../flow-node-continuity/flow-node-continuity-facade";
import type { TokenUsageSnapshot } from "../../session-continuity/continuity-types";
import {
  extractTokenUsage,
  isBelowRemainingPercentThreshold,
} from "../../session-continuity/token-usage";
import type { Session, SessionManager } from "../../session-manager";
import type { SessionContinuityRolloverOrchestrator } from "./session-continuity-rollover-orchestrator";
import type { SessionRequestHandlerResumeLifecycle } from "./session-request-handler-resume-lifecycle";
import type { SessionRequestHandlerTurnCompletion } from "./session-request-handler-turn-completion";
import type { SessionRequestHandlerTurnThresholdResolver } from "./session-request-handler-turn-threshold-resolver";

interface ProviderEventEnvelope {
  readonly payload?: unknown;
  readonly type?: string;
}

interface FlowNodePostTurnContextDecisionOptions {
  readonly deferPostTurnCompletion: boolean;
  readonly session: Session;
  readonly sessionId: string;
  readonly usage: TokenUsageSnapshot | null;
}

interface SessionRequestHandlerTurnArbitrationDependencies {
  readonly continuityRolloverOrchestrator: SessionContinuityRolloverOrchestrator;
  readonly flowNodeContinuity: FlowNodeContinuityFacade;
  readonly resumeLifecycle: SessionRequestHandlerResumeLifecycle;
  readonly sessionManager: SessionManager;
  readonly turnCompletion: SessionRequestHandlerTurnCompletion;
  readonly turnThresholdResolver: SessionRequestHandlerTurnThresholdResolver;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class SessionRequestHandlerTurnArbitration {
  private readonly deps: SessionRequestHandlerTurnArbitrationDependencies;

  constructor(deps: SessionRequestHandlerTurnArbitrationDependencies) {
    this.deps = deps;
  }

  runTurnCompletedArbitration(sessionId: string): void {
    this.deps.turnCompletion.runTurnCompletedArbitration(sessionId);
  }

  async handleFlowNodeContinuityProviderEvent(options: {
    readonly event: unknown;
    readonly resolveLiveContinuityRemainingPercentThreshold: (
      session: Session
    ) => Promise<number>;
    readonly sessionId: string;
  }): Promise<void> {
    const session = this.deps.sessionManager.getSession(options.sessionId);
    if (!session) {
      return;
    }

    const typedEvent = isRecord(options.event)
      ? (options.event as ProviderEventEnvelope)
      : null;
    const shouldDeferPostTurnCompletion = typedEvent?.type === "turn_completed";
    const usage = extractTokenUsage(options.event);
    this.deps.continuityRolloverOrchestrator.recordTokenUsageSnapshot(
      options.sessionId,
      usage
    );

    const shouldEvaluatePostTurnDecision =
      shouldDeferPostTurnCompletion ||
      (this.deps.resumeLifecycle.hasPendingPostTurnContextDecision(
        options.sessionId
      ) &&
        usage !== undefined);
    if (!shouldEvaluatePostTurnDecision) {
      return;
    }

    await this.resolveFlowNodePostTurnContextDecision({
      session,
      sessionId: options.sessionId,
      usage,
      deferPostTurnCompletion: shouldDeferPostTurnCompletion,
      resolveLiveContinuityRemainingPercentThreshold:
        options.resolveLiveContinuityRemainingPercentThreshold,
    });
  }

  async resolveLiveContinuityRemainingPercentThreshold(
    session: Session
  ): Promise<number> {
    return await this.deps.turnThresholdResolver.resolveLiveContinuityRemainingPercentThreshold(
      session
    );
  }

  private async resolveFlowNodePostTurnContextDecision(
    options: FlowNodePostTurnContextDecisionOptions & {
      readonly resolveLiveContinuityRemainingPercentThreshold: (
        session: Session
      ) => Promise<number>;
    }
  ): Promise<void> {
    const recordNoRolloverDecision = () => {
      if (options.deferPostTurnCompletion) {
        this.deps.resumeLifecycle.recordPostTurnContextDecision(
          options.sessionId,
          "no_rollover"
        );
        return;
      }
      this.deps.resumeLifecycle.registerPostTurnNoRolloverDecision(
        options.sessionId
      );
    };

    const recordRolloverRequiredDecision = () => {
      if (options.deferPostTurnCompletion) {
        this.deps.resumeLifecycle.recordPostTurnContextDecision(
          options.sessionId,
          "rollover_required"
        );
        return;
      }
      this.deps.resumeLifecycle.registerPostTurnRolloverRequiredDecision(
        options.sessionId
      );
    };

    if (
      this.deps.continuityRolloverOrchestrator.hasPending(options.sessionId)
    ) {
      recordRolloverRequiredDecision();
      return;
    }
    if (this.isStaleFlowNodeContinuitySegment(options.session)) {
      recordNoRolloverDecision();
      return;
    }
    if (!(options.session.initiativeSlug && options.session.stage)) {
      recordNoRolloverDecision();
      return;
    }
    if (
      !this.deps.flowNodeContinuity.isEligibleForRollover({
        stageId: options.session.stage,
        runSlug: options.session.runSlug,
      })
    ) {
      recordNoRolloverDecision();
      return;
    }

    const usage =
      options.usage ??
      this.deps.continuityRolloverOrchestrator.getTokenUsageSnapshot(
        options.sessionId
      );
    if (!usage) {
      return;
    }

    const remainingPercentThreshold =
      await options.resolveLiveContinuityRemainingPercentThreshold(
        options.session
      );
    if (!isBelowRemainingPercentThreshold(usage, remainingPercentThreshold)) {
      recordNoRolloverDecision();
      return;
    }

    await this.deps.continuityRolloverOrchestrator.startFlowNodeRolloverFromUsage(
      {
        session: options.session,
        sessionId: options.sessionId,
        stageId: options.session.stage,
        runSlug: options.session.runSlug ?? null,
        usage,
        remainingPercentThreshold,
      }
    );
  }

  private isStaleFlowNodeContinuitySegment(session: Session): boolean {
    if (!session.stage) {
      return false;
    }

    const stage = session.stage;
    const runSlug = session.runSlug ?? null;
    const initiativeSlug = session.initiativeSlug ?? null;
    const workspacePath = session.workspacePath;

    for (const candidate of this.deps.sessionManager.listSessions()) {
      if (
        candidate.continuationParentId === session.id &&
        candidate.workspacePath === workspacePath &&
        (candidate.initiativeSlug ?? null) === initiativeSlug &&
        candidate.stage === stage &&
        (candidate.runSlug ?? null) === runSlug
      ) {
        return true;
      }
    }
    return false;
  }
}
