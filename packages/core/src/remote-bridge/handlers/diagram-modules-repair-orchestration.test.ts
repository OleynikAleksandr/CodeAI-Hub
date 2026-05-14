import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import { runDiagramModulesRepairOrchestration } from "./diagram-modules-repair-orchestration";
import type { ManagedGitStatus } from "./managed-git-stage-gate";

const createManagedGitStatus = (): ManagedGitStatus =>
  ({
    dirtyByStage: { diagram_modules: [] },
    dirtyFiles: [],
  }) as unknown as ManagedGitStatus;

test("Diagram Modules repair orchestration is disabled during managed rewrite", async () => {
  const result = await runDiagramModulesRepairOrchestration({
    logger: new Logger("error"),
    managedGitStatus: createManagedGitStatus(),
    progress: null,
    workspaceRoot: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
  });

  assert.deepEqual(result, { status: "noop" });
});
