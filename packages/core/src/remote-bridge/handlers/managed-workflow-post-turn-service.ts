import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";

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
}
