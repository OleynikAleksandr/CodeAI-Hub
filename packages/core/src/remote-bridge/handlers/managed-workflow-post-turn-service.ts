import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type {
  ManagedAuditRecord,
  UnifiedSessionStorage,
} from "../../unified-session/storage";
import { sendApplicationSkeletonContinuationIfReady } from "./application-skeleton-continuation-dispatcher";
import { buildApplicationSkeletonRepairFeedbackMessage } from "./application-skeleton-contract-feedback";
import { evaluateApplicationSkeletonContractGuard } from "./application-skeleton-contract-guard";
import { classifyApplicationSkeletonPhase } from "./application-skeleton-phase-state";
import { readAndEvaluateApplicationSkeletonPrematureMaterialization } from "./application-skeleton-premature-materialization-validator";
import { readApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { classifyApplicationSkeletonReviewTurn } from "./application-skeleton-review-turn-classifier";
import { runApplicationSkeletonRevisionInjection } from "./application-skeleton-revision-injection-runner";
import { sendDiagramModulesContinuationIfReady } from "./diagram-modules-continuation-dispatcher";
import {
  readDiagramModulesProgressSnapshot,
  syncDiagramModulesSubturnState,
} from "./diagram-modules-progress";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import {
  attachManagedGitStatus,
  attachValidationDirtyGate,
  readManagedGitStatus,
} from "./managed-git-stage-gate";
import type { ApplicationSkeletonAcceptContractDecision } from "./managed-stage-accept-contract-handler";
import { runApplicationSkeletonAcceptContractCommand } from "./managed-stage-accept-contract-runner";
import { readQualityGatesProgressSnapshot } from "./quality-gates-progress";
import {
  WorkflowAgentAcceptanceFeedback,
  type WorkflowAgentAcceptanceFeedbackGateway,
} from "./workflow-agent-acceptance-feedback";
import { commitManagedDocumentationStageIfReady } from "./workflow-state-managed-documentation-commit";

export interface DevelopmentTreeAgentSessionOptions {
  readonly gateway: DevelopmentTreeAgentSessionGateway;
  readonly providerId: string;
  readonly technologyBase?: string;
}

const MANAGED_POST_TURN_STAGES = new Set([
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
]);

const DEFAULT_MANAGED_ARBITRATION_RETRY_LIMIT = 5;

const ACCEPTANCE_VERB_TO_CANONICAL: Readonly<Record<string, string>> = {
  принимаю: "Принимаю контракт",
  подтверждаю: "Подтверждаю контракт",
  утверждаю: "Утверждаю контракт",
  accept: "Accept Contract",
  accepted: "Accept Contract",
  confirm: "Accept Contract",
  confirmed: "Accept Contract",
  approve: "Accept Contract",
  approved: "Accept Contract",
};
const ACCEPTANCE_VERB_RE =
  /(?<!\p{L})(принимаю|подтверждаю|утверждаю|accept|accepted|confirm|confirmed|approve|approved)(?!\p{L})/iu;
const NEGATED_ACCEPTANCE_VERB_RE =
  /(?:не\s+(?:принимаю|подтверждаю|утверждаю)|(?:not|don'?t|won'?t|never|cannot|can'?t)\s+(?:accept(?:ed)?|confirm(?:ed)?|approve(?:d)?))/iu;

export const recognizeManagedContractAcceptancePhrase = (
  content: string
): string | null => {
  if (!content) {
    return null;
  }
  const normalized = content.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normalized) {
    return null;
  }
  if (NEGATED_ACCEPTANCE_VERB_RE.test(normalized)) {
    return null;
  }
  const verbMatch = normalized.match(ACCEPTANCE_VERB_RE);
  if (!verbMatch) {
    return null;
  }
  return ACCEPTANCE_VERB_TO_CANONICAL[verbMatch[1]] ?? "Accept Contract";
};

const MANAGED_CONTRACT_ACCEPTANCE_STAGES: ReadonlySet<string> = new Set([
  "application_skeleton",
  "quality_gates",
]);

export const recognizeManagedAcceptanceForStage = (
  stage: string | null | undefined,
  content: string
): string | null =>
  stage && MANAGED_CONTRACT_ACCEPTANCE_STAGES.has(stage)
    ? recognizeManagedContractAcceptancePhrase(content)
    : null;

export interface ManagedArbitrationRetryNotice {
  readonly attempts: number;
  readonly reason: string;
  readonly retryLimit: number;
  readonly sessionId: string;
  readonly stage: string;
  readonly workspaceSlug: string;
  readonly [extraField: string]: unknown;
}

export class ManagedWorkflowPostTurnService {
  private readonly acceptanceFeedback: WorkflowAgentAcceptanceFeedback;
  private readonly developmentTreeAgentSessions?: DevelopmentTreeAgentSessionOptions;
  private readonly logger: Logger;
  private readonly transaction = new ManagedDocumentationCommitTransaction();
  private readonly sessionManager?: SessionManager;
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly recentlyAcceptedSessions = new Set<string>();
  private readonly retryCounters = new Map<
    string,
    { stage: string; count: number }
  >();
  private readonly retryLimit: number;
  private readonly retryLimitNotifier?: (
    notice: ManagedArbitrationRetryNotice
  ) => void;
  private readonly unifiedSessionStorage?: UnifiedSessionStorage;

  constructor(options: {
    readonly developmentTreeAgentSessions?: DevelopmentTreeAgentSessionOptions;
    readonly logger: Logger;
    readonly onRetryLimitReached?: (
      notice: ManagedArbitrationRetryNotice
    ) => void;
    readonly retryLimit?: number;
    readonly sessionManager?: SessionManager;
    readonly unifiedSessionStorage?: UnifiedSessionStorage;
  }) {
    this.acceptanceFeedback = new WorkflowAgentAcceptanceFeedback(
      options.logger
    );
    this.developmentTreeAgentSessions = options.developmentTreeAgentSessions;
    this.logger = options.logger;
    this.sessionManager = options.sessionManager;
    this.retryLimit =
      options.retryLimit ?? DEFAULT_MANAGED_ARBITRATION_RETRY_LIMIT;
    this.retryLimitNotifier = options.onRetryLimitReached;
    this.unifiedSessionStorage = options.unifiedSessionStorage;
  }

  private async appendManagedAuditMessage(
    sessionId: string,
    record: ManagedAuditRecord
  ): Promise<void> {
    if (!this.unifiedSessionStorage) {
      return;
    }
    try {
      await this.unifiedSessionStorage.appendManagedAuditRecord({
        record,
        sessionId,
      });
    } catch (error: unknown) {
      this.logger.warn("Failed to append managed audit record", {
        sessionId,
        kind: record.kind,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  handle(sessionId: string): void {
    const session = this.sessionManager?.getSession(sessionId);
    if (
      !(
        session?.workspacePath &&
        session.initiativeSlug &&
        session.stage &&
        MANAGED_POST_TURN_STAGES.has(session.stage)
      )
    ) {
      return;
    }
    if (this.inFlight.has(sessionId)) {
      this.logger.debug(
        "Managed workflow post-turn arbitration already in flight; skipping concurrent invocation",
        { sessionId, workspaceSlug: session.initiativeSlug }
      );
      return;
    }
    const workspaceRoot = session.workspacePath;
    const workspaceSlug = session.initiativeSlug;
    const stage = session.stage;
    const task = this.run({ sessionId, stage, workspaceRoot, workspaceSlug })
      .catch((error: unknown) => {
        this.logger.warn("Managed workflow post-turn feedback failed", {
          sessionId,
          workspaceSlug,
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        this.inFlight.delete(sessionId);
      });
    this.inFlight.set(sessionId, task);
  }

  async whenIdle(sessionId: string): Promise<void> {
    while (this.inFlight.has(sessionId)) {
      const current = this.inFlight.get(sessionId);
      if (!current) {
        return;
      }
      await current.catch(() => undefined);
    }
  }

  // Application Skeleton accept-contract command: reads runtime state, calls
  // the pure decision in `managed-stage-accept-contract-handler.ts`, and on
  // acceptance routes the session through the existing Phase 2 dispatcher
  // path (mark recently-accepted, append audit, hand off to `handle()`).
  handleApplicationSkeletonAcceptContractCommand(params: {
    readonly sessionId: string;
    readonly source: "ui-button" | "typed-fallback";
  }): Promise<ApplicationSkeletonAcceptContractDecision> {
    return runApplicationSkeletonAcceptContractCommand({
      appendAudit: (sessionId, record) =>
        this.appendManagedAuditMessage(sessionId, record),
      handle: (sessionId) => this.handle(sessionId),
      logger: this.logger,
      markAccepted: (sessionId) => this.recentlyAcceptedSessions.add(sessionId),
      resetRetryCounter: (sessionId) => this.retryCounters.delete(sessionId),
      resolveSession: (sessionId) =>
        this.sessionManager?.getSession(sessionId) ?? null,
      sessionId: params.sessionId,
      source: params.source,
    });
  }

  handleContractAcceptance(params: {
    readonly phrase: string;
    readonly sessionId: string;
  }): void {
    const session = this.sessionManager?.getSession(params.sessionId);
    const stage = session?.stage ?? null;
    if (!(stage && MANAGED_CONTRACT_ACCEPTANCE_STAGES.has(stage))) {
      this.logger.warn(
        "Managed contract acceptance command ignored for non-managed stage",
        {
          sessionId: params.sessionId,
          phrase: params.phrase,
          stage: stage ?? null,
        }
      );
      return;
    }
    this.retryCounters.delete(params.sessionId);
    this.recentlyAcceptedSessions.add(params.sessionId);
    this.logger.info("Managed contract acceptance command accepted by Core", {
      sessionId: params.sessionId,
      phrase: params.phrase,
      stage,
    });
    this.appendManagedAuditMessage(params.sessionId, {
      kind: "managed_post_turn_decision",
      source: "core",
      text: `Managed contract acceptance accepted: ${params.phrase} (${stage})`,
      timestamp: new Date().toISOString(),
    }).catch(() => undefined);
    this.handle(params.sessionId);
  }

  private trackArbitrationAttempt(
    sessionId: string,
    stage: string,
    stageDirty: boolean
  ): { attempts: number; blocked: boolean } {
    if (!stageDirty) {
      this.retryCounters.delete(sessionId);
      return { attempts: 0, blocked: false };
    }
    const current = this.retryCounters.get(sessionId);
    const nextAttempts =
      current && current.stage === stage ? current.count + 1 : 1;
    this.retryCounters.set(sessionId, { stage, count: nextAttempts });
    return {
      attempts: nextAttempts,
      blocked: nextAttempts > this.retryLimit,
    };
  }

  private async run(params: {
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const [
      chains,
      rawDiagramModulesProgress,
      rawApplicationSkeletonProgress,
      rawQualityGatesProgress,
      managedGitStatus,
    ] = await Promise.all([
      SessionContinuityFacade.readWorkspaceChains(params),
      readDiagramModulesProgressSnapshot(params),
      readApplicationSkeletonProgressSnapshot(params),
      readQualityGatesProgressSnapshot(params),
      readManagedGitStatus(params.workspaceRoot, params.workspaceSlug),
    ]);
    const {
      applicationSkeletonProgress: latestApplicationSkeletonProgress,
      diagramModulesProgress: latestDiagramModulesProgress,
      managedGitStatus: latestManagedGitStatus,
      qualityGatesProgress: latestQualityGatesProgress,
    } = await commitManagedDocumentationStageIfReady({
      context: {
        applicationSkeletonProgress: rawApplicationSkeletonProgress,
        diagramModulesProgress: rawDiagramModulesProgress,
        managedGitStatus,
        qualityGatesProgress: rawQualityGatesProgress,
      },
      logger: this.logger,
      transaction: this.transaction,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const applicationSkeletonPhase = classifyApplicationSkeletonPhase(
      latestApplicationSkeletonProgress
    );
    if (
      latestApplicationSkeletonProgress?.materialized &&
      !rawApplicationSkeletonProgress?.materialized
    ) {
      this.logger.info(
        "Observed Application Skeleton materialization completion",
        {
          phase: applicationSkeletonPhase,
          sessionId: params.sessionId,
          stage: params.stage,
        }
      );
      this.recentlyAcceptedSessions.delete(params.sessionId);
    }
    const stageOwnedDirty =
      latestManagedGitStatus.dirtyByStage[
        params.stage as keyof typeof latestManagedGitStatus.dirtyByStage
      ] ?? [];
    const retryStatus = this.trackArbitrationAttempt(
      params.sessionId,
      params.stage,
      stageOwnedDirty.length > 0
    );
    if (retryStatus.blocked) {
      const notice: ManagedArbitrationRetryNotice = {
        attempts: retryStatus.attempts,
        reason: `Managed arbitration exceeded the per-stage retry limit of ${this.retryLimit} attempts without progress; pause issued for user-actionable resolution.`,
        retryLimit: this.retryLimit,
        sessionId: params.sessionId,
        stage: params.stage,
        workspaceSlug: params.workspaceSlug,
      };
      this.logger.warn(
        "Managed arbitration retry limit exceeded; pausing dispatch",
        notice
      );
      this.retryLimitNotifier?.(notice);
      return;
    }
    const diagramModulesProgress = attachManagedGitStatus(
      latestDiagramModulesProgress,
      latestManagedGitStatus.dirtyByStage.diagram_modules
    );
    const applicationSkeletonProgress = attachValidationDirtyGate(
      latestApplicationSkeletonProgress,
      "Application Skeleton",
      latestManagedGitStatus.dirtyByStage.application_skeleton
    );
    const allOwnedDirtyForSkeleton = latestManagedGitStatus.dirtyFiles ?? [];
    const applicationSkeletonPrematureDecision =
      await readAndEvaluateApplicationSkeletonPrematureMaterialization({
        accepted: latestApplicationSkeletonProgress?.accepted ?? false,
        ownedDirtyFiles: allOwnedDirtyForSkeleton,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
    const applicationSkeletonContractGuardDecision =
      evaluateApplicationSkeletonContractGuard({
        ownedDirtyFiles:
          latestManagedGitStatus.dirtyByStage.application_skeleton ?? [],
        phase: applicationSkeletonPhase,
        prematureDecision: applicationSkeletonPrematureDecision,
        progress: latestApplicationSkeletonProgress,
        terminalEventReceived: true,
      });
    if (applicationSkeletonContractGuardDecision.kind !== "noop") {
      this.logger.info("Application Skeleton phase 1A guard decision", {
        decision: applicationSkeletonContractGuardDecision.kind,
        phase: applicationSkeletonPhase,
        reason: applicationSkeletonContractGuardDecision.reason,
        sessionId: params.sessionId,
        stage: params.stage,
      });
    }
    const applicationSkeletonRepairMessage =
      buildApplicationSkeletonRepairFeedbackMessage(
        applicationSkeletonContractGuardDecision
      );
    const applicationSkeletonReviewTurnKind =
      classifyApplicationSkeletonReviewTurn({
        ownedDirtyFiles:
          latestManagedGitStatus.dirtyByStage.application_skeleton ?? [],
        phase: applicationSkeletonPhase,
      });
    if (applicationSkeletonReviewTurnKind !== "out_of_scope") {
      this.logger.info("Application Skeleton phase 1B review turn kind", {
        kind: applicationSkeletonReviewTurnKind,
        phase: applicationSkeletonPhase,
        sessionId: params.sessionId,
        stage: params.stage,
      });
    }
    if (applicationSkeletonReviewTurnKind === "revision") {
      await runApplicationSkeletonRevisionInjection({
        logger: this.logger,
        sessionId: params.sessionId,
        stage: params.stage,
        workspaceRoot: params.workspaceRoot,
      });
    }
    const qualityGatesProgress = attachValidationDirtyGate(
      latestQualityGatesProgress,
      "Quality Gates",
      latestManagedGitStatus.dirtyByStage.quality_gates
    );
    const gateway = this.developmentTreeAgentSessions?.gateway as
      | WorkflowAgentAcceptanceFeedbackGateway
      | undefined;
    await Promise.all([
      syncDiagramModulesSubturnState({
        progress: latestDiagramModulesProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      this.acceptanceFeedback.sendDiagramModulesFeedback({
        chains,
        gateway,
        progress: diagramModulesProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      sendDiagramModulesContinuationIfReady({
        chains,
        gateway,
        progress: diagramModulesProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      sendApplicationSkeletonContinuationIfReady({
        chains,
        gateway,
        progress: applicationSkeletonProgress,
        recentlyAcceptedSessions: this.recentlyAcceptedSessions,
      }),
      this.acceptanceFeedback.sendApplicationSkeletonFeedback({
        chains,
        gateway,
        progress: applicationSkeletonProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      this.acceptanceFeedback.sendQualityGatesFeedback({
        chains,
        gateway,
        progress: qualityGatesProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
    ]);
    if (gateway && applicationSkeletonRepairMessage) {
      const skeletonSessionId =
        chains
          .find((chain) => chain.stage === "application_skeleton")
          ?.segments.at(-1)?.sessionId ?? null;
      if (skeletonSessionId) {
        await gateway.handleMessage(
          skeletonSessionId,
          applicationSkeletonRepairMessage
        );
      }
    }
  }
}
