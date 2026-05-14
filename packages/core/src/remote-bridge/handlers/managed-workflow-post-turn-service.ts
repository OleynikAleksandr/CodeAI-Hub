import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonAcceptContractDecision } from "./managed-stage-accept-contract-handler";
import type { QualityGatesAcceptContractDecision } from "./quality-gates-accept-contract-runner";

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
const MANAGED_CONTRACT_ACCEPTANCE_STAGES = new Set([
  "application_skeleton",
  "quality_gates",
]);
const MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE =
  "managed_workflow_rewrite_in_progress";
const MANAGED_WORKFLOW_REWRITE_BLOCKER_REASON =
  "Managed workflow orchestration is temporarily disabled while the orchestration cluster is being rewritten.";

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
const ACCEPTANCE_PHRASE_MAX_LENGTH = 200;

export const recognizeManagedContractAcceptancePhrase = (
  content: string
): string | null => {
  if (!content || content.length > ACCEPTANCE_PHRASE_MAX_LENGTH) {
    return null;
  }
  const normalized = content.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normalized || NEGATED_ACCEPTANCE_VERB_RE.test(normalized)) {
    return null;
  }
  const verbMatch = normalized.match(ACCEPTANCE_VERB_RE);
  if (!verbMatch) {
    return null;
  }
  return ACCEPTANCE_VERB_TO_CANONICAL[verbMatch[1] ?? ""] ?? null;
};

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
  private readonly logger: Logger;
  private readonly sessionManager?: SessionManager;

  constructor(options: {
    readonly developmentTreeAgentSessions?: DevelopmentTreeAgentSessionOptions;
    readonly logger: Logger;
    readonly onRetryLimitReached?: (
      notice: ManagedArbitrationRetryNotice
    ) => void;
    readonly retryLimit?: number;
    readonly sessionManager?: SessionManager;
  }) {
    this.logger = options.logger;
    this.sessionManager = options.sessionManager;
  }

  handle(sessionId: string): void {
    const session = this.sessionManager?.getSession(sessionId);
    if (!(session?.stage && MANAGED_POST_TURN_STAGES.has(session.stage))) {
      return;
    }
    this.logger.warn(
      "Managed workflow post-turn arbitration blocked during orchestration rewrite",
      {
        code: MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE,
        sessionId,
        stage: session.stage,
      }
    );
  }

  whenIdle(_sessionId: string): Promise<void> {
    return Promise.resolve();
  }

  handleApplicationSkeletonAcceptContractCommand(params: {
    readonly sessionId: string;
    readonly source: "ui-button" | "typed-fallback";
  }): Promise<ApplicationSkeletonAcceptContractDecision> {
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

  handleQualityGatesAcceptContractCommand(params: {
    readonly sessionId: string;
    readonly source: "ui-button" | "typed-fallback";
  }): Promise<QualityGatesAcceptContractDecision> {
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

  handleContractAcceptance(params: {
    readonly phrase: string;
    readonly sessionId: string;
  }): void {
    const stage = this.sessionManager?.getSession(params.sessionId)?.stage;
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
    this.logger.warn(
      "Managed contract acceptance command blocked during orchestration rewrite",
      {
        code: MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE,
        sessionId: params.sessionId,
        phrase: params.phrase,
        stage,
      }
    );
  }
}
