import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonGuardDecision } from "./application-skeleton-contract-guard";
import { runApplicationSkeletonRepairOrchestration } from "./application-skeleton-repair-orchestration";
import type { ManagedGitStatus } from "./managed-git-stage-gate";

const createManagedGitStatus = (): ManagedGitStatus =>
  ({
    dirtyByStage: { application_skeleton: [] },
    dirtyFiles: [],
  }) as unknown as ManagedGitStatus;

test("Application Skeleton repair orchestration is disabled during managed rewrite", async () => {
  const decision: ApplicationSkeletonGuardDecision = {
    kind: "repair_no_progress",
    reason: "terminal_no_owned_diff_in_phase_1a",
  };
  const result = await runApplicationSkeletonRepairOrchestration({
    decision,
    logger: new Logger("error"),
    managedGitStatus: createManagedGitStatus(),
    phase: "phase_1_draft",
    progress: null,
    workspaceRoot: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
  });

  assert.deepEqual(result, { status: "noop" });
});
