import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
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
import {
  type ApplicationSkeletonProgressSnapshot,
  readApplicationSkeletonProgressSnapshot,
} from "./application-skeleton-progress";
import { runApplicationSkeletonRepairOrchestration } from "./application-skeleton-repair-orchestration";
import { classifyApplicationSkeletonReviewTurn } from "./application-skeleton-review-turn-classifier";
import { runApplicationSkeletonRevisionInjection } from "./application-skeleton-revision-injection-runner";
import { sendDiagramModulesContinuationIfReady } from "./diagram-modules-continuation-dispatcher";
import {
  type DiagramModulesProgressSnapshot,
  readDiagramModulesProgressSnapshot,
  syncDiagramModulesSubturnState,
} from "./diagram-modules-progress";
import { runDiagramModulesRepairOrchestration } from "./diagram-modules-repair-orchestration";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import {
  attachManagedGitStatus,
  attachValidationDirtyGate,
  type ManagedGitStatus,
  readManagedGitStatus,
} from "./managed-git-stage-gate";
import type { ApplicationSkeletonAcceptContractDecision } from "./managed-stage-accept-contract-handler";
import { runApplicationSkeletonAcceptContractCommand } from "./managed-stage-accept-contract-runner";
import {
  type QualityGatesAcceptContractDecision,
  runQualityGatesAcceptContractCommand,
} from "./quality-gates-accept-contract-runner";
import { sendQualityGatesContinuationIfReady } from "./quality-gates-continuation-dispatcher";
import { buildQualityGatesRepairFeedbackMessage } from "./quality-gates-contract-feedback";
import {
  evaluateQualityGatesContractGuard,
  type QualityGatesPhase,
} from "./quality-gates-contract-guard";
import {
  type QualityGatesProgressSnapshot,
  readQualityGatesProgressSnapshot,
} from "./quality-gates-progress";
import { runQualityGatesRepairOrchestration } from "./quality-gates-repair-orchestration";
import { classifyQualityGatesReviewTurn } from "./quality-gates-review-turn-classifier";
import { runQualityGatesRevisionInjection } from "./quality-gates-revision-injection-runner";
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
const MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE =
  "managed_workflow_rewrite_in_progress";
const MANAGED_WORKFLOW_REWRITE_BLOCKER_REASON =
  "Managed workflow orchestration is temporarily disabled while the orchestration cluster is being rewritten.";

const legacyManagedOrchestrationEnabled = (): boolean => false;

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

// Acceptance phrases are short user-typed messages (typically 1–50 chars).
// Core bootstrap prompts, repair feedback, continuation prompts, and any
// other multi-paragraph context can be 10 KB to 200 KB and frequently mention
// acceptance flow language ("Accept Contract", "accepted state", etc.). The
// length cap excludes those long-form contexts before regex matching so the
// broadened recognizer cannot intercept a Core-built bootstrap prompt as a
// false-positive typed acceptance.
const ACCEPTANCE_PHRASE_MAX_LENGTH = 200;

export const recognizeManagedContractAcceptancePhrase = (
  content: string
): string | null => {
  if (!content || content.length > ACCEPTANCE_PHRASE_MAX_LENGTH) {
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
  private readonly queuedReruns = new Set<string>();
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
    if (!legacyManagedOrchestrationEnabled()) {
      this.logger.warn(
        "Managed workflow post-turn arbitration blocked during orchestration rewrite",
        {
          code: MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE,
          sessionId,
          stage: session.stage,
        }
      );
      return;
    }
    if (this.inFlight.has(sessionId)) {
      this.queuedReruns.add(sessionId);
      this.logger.debug(
        "Managed workflow post-turn arbitration already in flight; queued rerun after current pass",
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
        if (this.queuedReruns.delete(sessionId)) {
          this.logger.debug(
            "Managed workflow post-turn arbitration replaying queued rerun",
            { sessionId, workspaceSlug }
          );
          this.handle(sessionId);
        }
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
    if (!legacyManagedOrchestrationEnabled()) {
      this.logger.warn(
        "Application Skeleton accept-contract command blocked during orchestration rewrite",
        {
          code: MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE,
          sessionId: params.sessionId,
          source: params.source,
        }
      );
      return Promise.resolve({
        kind: "rejected",
        reasons: [MANAGED_WORKFLOW_REWRITE_BLOCKER_REASON],
        stage: "application_skeleton",
      });
    }
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

  handleQualityGatesAcceptContractCommand(params: {
    readonly sessionId: string;
    readonly source: "ui-button" | "typed-fallback";
  }): Promise<QualityGatesAcceptContractDecision> {
    if (!legacyManagedOrchestrationEnabled()) {
      this.logger.warn(
        "Quality Gates accept-contract command blocked during orchestration rewrite",
        {
          code: MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE,
          sessionId: params.sessionId,
          source: params.source,
        }
      );
      return Promise.resolve({
        kind: "rejected",
        reasons: [MANAGED_WORKFLOW_REWRITE_BLOCKER_REASON],
        stage: "quality_gates",
      });
    }
    return runQualityGatesAcceptContractCommand({
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
    if (!legacyManagedOrchestrationEnabled()) {
      this.logger.warn(
        "Managed contract acceptance command blocked during orchestration rewrite",
        {
          code: MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE,
          sessionId: params.sessionId,
          phrase: params.phrase,
          stage,
        }
      );
      return;
    }
    if (stage === "quality_gates") {
      this.handleQualityGatesAcceptContractCommand({
        sessionId: params.sessionId,
        source: "typed-fallback",
      }).catch((error: unknown) => {
        this.logger.error(
          "Quality Gates typed acceptance routing failed",
          error instanceof Error ? error : undefined,
          { sessionId: params.sessionId }
        );
      });
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
    const preparedManagedGitStatus =
      await this.injectManagedReviewRevisionBeforeCommit({
        applicationSkeletonProgress: rawApplicationSkeletonProgress,
        managedGitStatus,
        qualityGatesProgress: rawQualityGatesProgress,
        sessionId: params.sessionId,
        stage: params.stage,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
    const {
      applicationSkeletonProgress: latestApplicationSkeletonProgress,
      diagramModulesProgress: latestDiagramModulesProgress,
      managedGitStatus: latestManagedGitStatus,
      qualityGatesProgress: latestQualityGatesProgress,
    } = await commitManagedDocumentationStageIfReady({
      context: {
        applicationSkeletonProgress: rawApplicationSkeletonProgress,
        diagramModulesProgress: rawDiagramModulesProgress,
        managedGitStatus: preparedManagedGitStatus,
        qualityGatesProgress: rawQualityGatesProgress,
      },
      logger: this.logger,
      transaction: this.transaction,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
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
    const gateway = this.developmentTreeAgentSessions?.gateway as
      | WorkflowAgentAcceptanceFeedbackGateway
      | undefined;
    if (params.stage === "diagram_modules") {
      await this.runDiagramModulesPostTurn({
        chains,
        gateway,
        managedGitStatus: latestManagedGitStatus,
        progress: latestDiagramModulesProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
      return;
    }
    if (params.stage === "application_skeleton") {
      await this.runApplicationSkeletonPostTurn({
        chains,
        gateway,
        latestProgress: latestApplicationSkeletonProgress,
        managedGitStatus: latestManagedGitStatus,
        rawProgress: rawApplicationSkeletonProgress,
        sessionId: params.sessionId,
        stage: params.stage,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
      return;
    }
    if (params.stage === "quality_gates") {
      await this.runQualityGatesPostTurn({
        chains,
        gateway,
        managedGitStatus: latestManagedGitStatus,
        progress: latestQualityGatesProgress,
        sessionId: params.sessionId,
        stage: params.stage,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
    }
  }

  private async injectManagedReviewRevisionBeforeCommit(params: {
    readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
    readonly managedGitStatus: ManagedGitStatus;
    readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ManagedGitStatus> {
    if (params.stage === "application_skeleton") {
      const phase = classifyApplicationSkeletonPhase(
        params.applicationSkeletonProgress
      );
      const reviewTurnKind = classifyApplicationSkeletonReviewTurn({
        ownedDirtyFiles:
          params.managedGitStatus.dirtyByStage.application_skeleton ?? [],
        phase,
      });
      if (reviewTurnKind === "revision") {
        await runApplicationSkeletonRevisionInjection({
          logger: this.logger,
          sessionId: params.sessionId,
          stage: params.stage,
          workspaceRoot: params.workspaceRoot,
        });
        return readManagedGitStatus(params.workspaceRoot, params.workspaceSlug);
      }
    }
    if (params.stage === "quality_gates") {
      const phase = classifyQualityGatesPhase(params.qualityGatesProgress);
      const reviewTurnKind = classifyQualityGatesReviewTurn({
        ownedDirtyFiles:
          params.managedGitStatus.dirtyByStage.quality_gates ?? [],
        phase,
      });
      if (reviewTurnKind === "revision") {
        await runQualityGatesRevisionInjection({
          logger: this.logger,
          sessionId: params.sessionId,
          stage: params.stage,
          workspaceRoot: params.workspaceRoot,
        });
        return readManagedGitStatus(params.workspaceRoot, params.workspaceSlug);
      }
    }
    return params.managedGitStatus;
  }

  private async runDiagramModulesPostTurn(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway: WorkflowAgentAcceptanceFeedbackGateway | undefined;
    readonly managedGitStatus: ManagedGitStatus;
    readonly progress: DiagramModulesProgressSnapshot | null;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    await runDiagramModulesRepairOrchestration({
      logger: this.logger,
      managedGitStatus: params.managedGitStatus,
      progress: params.progress,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const progress = attachManagedGitStatus(
      params.progress,
      params.managedGitStatus.dirtyByStage.diagram_modules
    );
    await Promise.all([
      syncDiagramModulesSubturnState({
        progress: params.progress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      this.acceptanceFeedback.sendDiagramModulesFeedback({
        chains: params.chains,
        gateway: params.gateway,
        progress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      sendDiagramModulesContinuationIfReady({
        chains: params.chains,
        gateway: params.gateway,
        progress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
    ]);
  }

  private async runApplicationSkeletonPostTurn(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway: WorkflowAgentAcceptanceFeedbackGateway | undefined;
    readonly latestProgress: ApplicationSkeletonProgressSnapshot | null;
    readonly managedGitStatus: ManagedGitStatus;
    readonly rawProgress: ApplicationSkeletonProgressSnapshot | null;
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const phase = classifyApplicationSkeletonPhase(params.latestProgress);
    if (
      params.latestProgress?.materialized &&
      !params.rawProgress?.materialized
    ) {
      this.logger.info(
        "Observed Application Skeleton materialization completion",
        { phase, sessionId: params.sessionId, stage: params.stage }
      );
      this.recentlyAcceptedSessions.delete(params.sessionId);
    }
    const progress = attachValidationDirtyGate(
      params.latestProgress,
      "Application Skeleton",
      params.managedGitStatus.dirtyByStage.application_skeleton
    );
    const prematureDecision =
      await readAndEvaluateApplicationSkeletonPrematureMaterialization({
        accepted: params.latestProgress?.accepted ?? false,
        ownedDirtyFiles: params.managedGitStatus.dirtyFiles ?? [],
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
    const guardDecision = evaluateApplicationSkeletonContractGuard({
      ownedDirtyFiles:
        params.managedGitStatus.dirtyByStage.application_skeleton ?? [],
      phase,
      prematureDecision,
      progress: params.latestProgress,
      terminalEventReceived: true,
    });
    if (guardDecision.kind !== "noop") {
      this.logger.info("Application Skeleton phase 1A guard decision", {
        decision: guardDecision.kind,
        phase,
        reason: guardDecision.reason,
        sessionId: params.sessionId,
        stage: params.stage,
      });
    }
    const repairMessage =
      buildApplicationSkeletonRepairFeedbackMessage(guardDecision);
    await runApplicationSkeletonRepairOrchestration({
      decision: guardDecision,
      logger: this.logger,
      managedGitStatus: params.managedGitStatus,
      phase,
      progress: params.latestProgress,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    await this.runApplicationSkeletonReviewAndFeedback({
      chains: params.chains,
      gateway: params.gateway,
      ownedDirtyFiles:
        params.managedGitStatus.dirtyByStage.application_skeleton ?? [],
      phase,
      progress,
      repairMessage,
      sessionId: params.sessionId,
      stage: params.stage,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }

  private async runApplicationSkeletonReviewAndFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway: WorkflowAgentAcceptanceFeedbackGateway | undefined;
    readonly ownedDirtyFiles: readonly string[];
    readonly phase: ReturnType<typeof classifyApplicationSkeletonPhase>;
    readonly progress: ApplicationSkeletonProgressSnapshot | null;
    readonly repairMessage: string | null;
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const reviewTurnKind = classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: params.ownedDirtyFiles,
      phase: params.phase,
    });
    if (reviewTurnKind !== "out_of_scope") {
      this.logger.info("Application Skeleton phase 1B review turn kind", {
        kind: reviewTurnKind,
        phase: params.phase,
        sessionId: params.sessionId,
        stage: params.stage,
      });
    }
    await Promise.all([
      sendApplicationSkeletonContinuationIfReady({
        chains: params.chains,
        gateway: params.gateway,
        progress: params.progress,
        recentlyAcceptedSessions: this.recentlyAcceptedSessions,
      }),
      this.acceptanceFeedback.sendApplicationSkeletonFeedback({
        chains: params.chains,
        gateway: params.gateway,
        progress: params.progress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
    ]);
    await this.sendApplicationSkeletonRepairMessage(params);
  }

  private async sendApplicationSkeletonRepairMessage(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway: WorkflowAgentAcceptanceFeedbackGateway | undefined;
    readonly repairMessage: string | null;
  }): Promise<void> {
    if (!(params.gateway && params.repairMessage)) {
      return;
    }
    const sessionId =
      params.chains
        .find((chain) => chain.stage === "application_skeleton")
        ?.segments.at(-1)?.sessionId ?? null;
    if (sessionId) {
      await params.gateway.handleMessage(sessionId, params.repairMessage);
    }
  }

  private async runQualityGatesPostTurn(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway: WorkflowAgentAcceptanceFeedbackGateway | undefined;
    readonly managedGitStatus: ManagedGitStatus;
    readonly progress: QualityGatesProgressSnapshot | null;
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const ownedDirtyFiles =
      params.managedGitStatus.dirtyByStage.quality_gates ?? [];
    const progress =
      params.progress && params.progress.validationErrors.length === 0
        ? attachValidationDirtyGate(
            params.progress,
            "Quality Gates",
            ownedDirtyFiles
          )
        : params.progress;
    const phase = classifyQualityGatesPhase(params.progress);
    const guardDecision = evaluateQualityGatesContractGuard({
      ownedDirtyFiles,
      phase,
      progress: params.progress,
      terminalEventReceived: true,
    });
    if (guardDecision.kind !== "noop") {
      this.logger.info("Quality Gates guard decision", {
        decision: guardDecision.kind,
        phase,
        reason: guardDecision.reason,
        sessionId: params.sessionId,
        stage: params.stage,
      });
    }
    const repairMessage = buildQualityGatesRepairFeedbackMessage(guardDecision);
    await runQualityGatesRepairOrchestration({
      decision: guardDecision,
      logger: this.logger,
      managedGitStatus: params.managedGitStatus,
      phase,
      progress: params.progress,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    await Promise.all([
      this.acceptanceFeedback.sendQualityGatesFeedback({
        chains: params.chains,
        gateway: params.gateway,
        progress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      sendQualityGatesContinuationIfReady({
        chains: params.chains,
        gateway: params.gateway,
        progress,
        recentlyAcceptedSessions: this.recentlyAcceptedSessions,
      }),
    ]);
    if (params.gateway && repairMessage) {
      const sessionId =
        params.chains
          .find((chain) => chain.stage === "quality_gates")
          ?.segments.at(-1)?.sessionId ?? null;
      if (sessionId) {
        await params.gateway.handleMessage(sessionId, repairMessage);
      }
    }
  }
}

const classifyQualityGatesPhase = (
  progress: QualityGatesProgressSnapshot | null
): QualityGatesPhase => {
  if (!progress) {
    return "phase_idle";
  }
  if (progress.substep === "integrated") {
    return "phase_4_user_return";
  }
  if (
    progress.acceptanceCommitted === true &&
    (progress.substep === "failed" ||
      progress.substep === "integrating" ||
      progress.integrationState === "failed" ||
      progress.integrationState === "integrated" ||
      progress.integrationState === "in_progress" ||
      progress.integrationState === "outdated")
  ) {
    return "phase_3_integration";
  }
  if (
    progress.substep === "integrating" ||
    progress.integrationState === "in_progress"
  ) {
    return "phase_3_integration";
  }
  if (progress.acceptanceCommitted === true) {
    return "phase_2_accepted";
  }
  if (progress.accepted === true) {
    return "phase_2_review";
  }
  if (progress.substep === "awaiting_acceptance") {
    return "phase_2_review";
  }
  return "phase_1_draft";
};
