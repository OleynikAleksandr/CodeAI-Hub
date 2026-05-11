import type { ManagedAuditRecord } from "../../unified-session/storage";
import {
  type ApplicationSkeletonAcceptanceWriteResult,
  writeApplicationSkeletonAcceptance,
} from "./application-skeleton-acceptance-writer";
import { classifyApplicationSkeletonPhase } from "./application-skeleton-phase-state";
import {
  type ApplicationSkeletonProgressSnapshot,
  readApplicationSkeletonProgressSnapshot,
} from "./application-skeleton-progress";
import {
  type ManagedGitStatus,
  readManagedGitStatus,
} from "./managed-git-stage-gate";
import {
  type ApplicationSkeletonAcceptContractDecision,
  evaluateApplicationSkeletonAcceptContractCommand,
} from "./managed-stage-accept-contract-handler";

// Side-effecting runner for the Application Skeleton accept-contract command.
// Reads runtime state, calls the pure decision handler, and on acceptance
// applies the Option B side-effects via the supplied dependency callbacks
// (mark recently-accepted, append audit, route to the existing post-turn
// dispatcher). Decoupled from `ManagedWorkflowPostTurnService` so that the
// post-turn-service file stays under the architecture line-count limit.

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

export const runApplicationSkeletonAcceptContractCommand = async (
  params: ApplicationSkeletonAcceptContractRunnerInput &
    ApplicationSkeletonAcceptContractRunnerDeps
): Promise<ApplicationSkeletonAcceptContractDecision> => {
  const session = params.resolveSession(params.sessionId);
  const workspaceRoot = session?.workspacePath ?? null;
  const workspaceSlug = session?.initiativeSlug ?? null;
  if (
    !(session && workspaceRoot && workspaceSlug) ||
    session.stage !== "application_skeleton"
  ) {
    return {
      kind: "rejected",
      reasons: ["Acceptance command requires an Application Skeleton session."],
      stage: "application_skeleton",
    };
  }
  const readProgress =
    params.readApplicationSkeletonProgress ??
    readApplicationSkeletonProgressSnapshot;
  const readGit = params.readManagedGit ?? readManagedGitStatus;
  const [progress, managedGitStatus] = await Promise.all([
    readProgress({ workspaceRoot, workspaceSlug }),
    readGit(workspaceRoot, workspaceSlug),
  ]);
  const decision = evaluateApplicationSkeletonAcceptContractCommand({
    applicationSkeletonProgress: progress,
    managedGitStatus,
    phase: classifyApplicationSkeletonPhase(progress),
  });
  params.logger.info("Application Skeleton accept-contract command", {
    decision: decision.kind,
    sessionId: params.sessionId,
    source: params.source,
    workspaceSlug,
  });
  if (decision.kind !== "accepted") {
    return decision;
  }
  // Variant A (Phase 24 acceptance write-path fix): the runner is the single
  // owner of the `accepted: true` write on `application-skeleton-map.json`.
  // PM button (via HTTP endpoint) and typed-fallback recognizer both funnel
  // through this runner, so patching the map here closes the Phase 22 hole
  // where every acceptance entry point only set the in-memory marker and the
  // Phase 3 dispatcher (Option C) never observed `progress.accepted === true`.
  const writeAcceptance =
    params.writeAcceptanceFlag ?? writeApplicationSkeletonAcceptance;
  const writeResult = await writeAcceptance({
    workspaceRoot,
    workspaceSlug,
  });
  params.logger.info("Application Skeleton acceptance map.json write", {
    sessionId: params.sessionId,
    source: params.source,
    status: writeResult.status,
    workspaceSlug,
  });
  params.resetRetryCounter(params.sessionId);
  params.markAccepted(params.sessionId);
  params
    .appendAudit(params.sessionId, {
      kind: "managed_post_turn_decision",
      source: "core",
      text: `Application Skeleton acceptance via ${params.source}`,
      timestamp: new Date().toISOString(),
    })
    .catch(() => undefined);
  params.handle(params.sessionId);
  return decision;
};
