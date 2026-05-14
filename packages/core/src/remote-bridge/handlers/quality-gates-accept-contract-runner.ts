import type { ManagedAuditRecord } from "../../unified-session/storage";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import type { QualityGatesAcceptanceWriteResult } from "./quality-gates-acceptance-writer";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

const QUALITY_GATES_ACCEPT_CONTRACT_DISABLED_REASON =
  "Quality Gates accept-contract side effects are disabled while the managed workflow orchestration cluster is being rewritten.";

export type QualityGatesAcceptContractDecision =
  | { readonly kind: "accepted"; readonly stage: "quality_gates" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly string[];
      readonly stage: "quality_gates";
    };

export interface QualityGatesAcceptContractSession {
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly workspacePath?: string | null;
}

export interface QualityGatesAcceptContractRunnerLogger {
  readonly info: (message: string, payload?: Record<string, unknown>) => void;
}

export interface QualityGatesAcceptContractRunnerDeps {
  readonly appendAudit: (
    sessionId: string,
    record: ManagedAuditRecord
  ) => Promise<void>;
  readonly handle: (sessionId: string) => void;
  readonly injectAcceptanceTaskPair?: (params: {
    readonly workspaceRoot: string;
  }) => Promise<boolean>;
  readonly logger: QualityGatesAcceptContractRunnerLogger;
  readonly markAccepted: (sessionId: string) => void;
  readonly readManagedGit?: (
    workspaceRoot: string,
    workspaceSlug: string
  ) => Promise<ManagedGitStatus>;
  readonly readQualityGatesProgress?: (params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }) => Promise<QualityGatesProgressSnapshot | null>;
  readonly resetRetryCounter: (sessionId: string) => void;
  readonly resolveSession: (
    sessionId: string
  ) => QualityGatesAcceptContractSession | null | undefined;
  readonly writeAcceptanceFlag?: (params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }) => Promise<QualityGatesAcceptanceWriteResult>;
}

export interface QualityGatesAcceptContractRunnerInput {
  readonly sessionId: string;
  readonly source: "ui-button" | "typed-fallback";
}

export const runQualityGatesAcceptContractCommand = (
  params: QualityGatesAcceptContractRunnerInput &
    QualityGatesAcceptContractRunnerDeps
): Promise<QualityGatesAcceptContractDecision> => {
  params.logger.info(QUALITY_GATES_ACCEPT_CONTRACT_DISABLED_REASON, {
    sessionId: params.sessionId,
    source: params.source,
  });
  return Promise.resolve({
    kind: "rejected",
    reasons: [QUALITY_GATES_ACCEPT_CONTRACT_DISABLED_REASON],
    stage: "quality_gates",
  });
};
