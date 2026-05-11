import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { WorkflowStateFacade } from "../../workflow/state/workflow-state-facade";
import { hydrateWorkflowStateFromFilesystem } from "./workflow-state-filesystem-hydration";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

test("filesystem hydration moves provider virtual-simulation alias into canonical stage directory", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-vs-alias-")
  );
  const workspaceSlug = "demo-workspace";
  const canonicalPath = path.join(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`
  );
  const aliasDir = path.join(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/virtual-simulation`
  );
  const aliasPath = path.join(aliasDir, "virtual-simulation.md");

  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/virtual-simulation/virtual-simulation.md`,
      ["# Virtual Simulation: Demo", "", "## Scenario 1", "Ready."].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/virtual-simulation/.DS_Store`,
      ""
    );

    const state = new WorkflowStateFacade({ workspaceSlug }).snapshot();
    const hydratedState = await hydrateWorkflowStateFromFilesystem({
      state,
      workspaceRoot,
      workspaceSlug,
    });

    const virtualSimulation = hydratedState.stages.virtual_simulation;
    assert.equal(virtualSimulation.status, "completed");
    assert.deepEqual(
      virtualSimulation.artifacts.map((artifact) => artifact.path),
      ["virtual_simulation/virtual-simulation.md"]
    );
    assert.equal((await stat(canonicalPath)).isFile(), true);
    assert.equal(await stat(aliasPath).catch(() => null), null);
    assert.equal(await stat(aliasDir).catch(() => null), null);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
