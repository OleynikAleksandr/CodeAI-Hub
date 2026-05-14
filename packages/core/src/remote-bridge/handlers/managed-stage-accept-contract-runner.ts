import type { ManagedAuditRecord } from "../../unified-session/storage";
import type { ApplicationSkeletonAcceptanceWriteResult } from "./application-skeleton-acceptance-writer";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import type { ApplicationSkeletonAcceptContractDecision } from "./managed-stage-accept-contract-handler";

const APPLICATION_SKELETON_ACCEPT_CONTRACT_DISABLED_REASON =
  "Application Skeleton accept-contract side effects are disabled while the managed workflow orchestration cluster is being rewritten.";

export interface ApplicationSkeletonAcceptContractSession {
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly workspacePath?: string | null;
}

export interface ApplicationSkeletonAcceptContractRunnerLogger {
  readonly info: (message: string, payload?: Record<string, unknown>) => void;
}

export interface ApplicationSkeletonAcceptContractRunnerDeps {
  readonly appendAudit: (
    sessionId: string,
    record: ManagedAuditRecord
  ) => Promise<void>;
  readonly handle: (sessionId: string) => void;
  readonly injectAcceptanceTaskPair?: (params: {
    readonly workspaceRoot: string;
  }) => Promise<boolean>;
  readonly logger: ApplicationSkeletonAcceptContractRunnerLogger;
  readonly markAccepted: (sessionId: string) => void;
  readonly readApplicationSkeletonProgress?: (params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }) => Promise<ApplicationSkeletonProgressSnapshot | null>;
  readonly readManagedGit?: (
    workspaceRoot: string,
    workspaceSlug: string
  ) => Promise<ManagedGitStatus>;
  readonly resetRetryCounter: (sessionId: string) => void;
  readonly resolveSession: (
    sessionId: string
  ) => ApplicationSkeletonAcceptContractSession | null | undefined;
  readonly writeAcceptanceFlag?: (params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }) => Promise<ApplicationSkeletonAcceptanceWriteResult>;
}

export interface ApplicationSkeletonAcceptContractRunnerInput {
  readonly sessionId: string;
  readonly source: "ui-button" | "typed-fallback";
}

export const runApplicationSkeletonAcceptContractCommand = (
  params: ApplicationSkeletonAcceptContractRunnerInput &
    ApplicationSkeletonAcceptContractRunnerDeps
): Promise<ApplicationSkeletonAcceptContractDecision> => {
  params.logger.info(APPLICATION_SKELETON_ACCEPT_CONTRACT_DISABLED_REASON, {
    sessionId: params.sessionId,
    source: params.source,
  });
  return Promise.resolve({
    kind: "rejected",
    reasons: [APPLICATION_SKELETON_ACCEPT_CONTRACT_DISABLED_REASON],
    stage: "application_skeleton",
  });
};
