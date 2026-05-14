import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import type { QualityGatesGuardDecision } from "./quality-gates-contract-guard";
import { runQualityGatesRepairOrchestration } from "./quality-gates-repair-orchestration";

const createManagedGitStatus = (): ManagedGitStatus =>
  ({
    dirtyByStage: { quality_gates: [] },
    dirtyFiles: [],
  }) as unknown as ManagedGitStatus;

test("Quality Gates repair orchestration is disabled during managed rewrite", async () => {
  const decision: QualityGatesGuardDecision = {
    kind: "repair_no_progress",
    reason: "terminal_no_owned_diff_in_phase_1_draft",
  };
  const result = await runQualityGatesRepairOrchestration({
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
