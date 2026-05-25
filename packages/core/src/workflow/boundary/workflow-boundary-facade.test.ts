import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { WorkflowBoundaryFacade } from "./workflow-boundary-facade";

const WORKSPACE_SLUG = "demo-workspace";

const createWorkspace = async (): Promise<string> =>
  await mkdtemp(path.join(tmpdir(), "codeai-boundary-"));

test("WorkflowBoundaryFacade restores selected stage boundary and prunes downstream registry", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
    });
    await writeFile(
      path.join(workspaceRoot, "description.md"),
      "description\n"
    );
    const descriptionBoundary = await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeFile(path.join(workspaceRoot, "virtual.md"), "virtual\n");
    const virtualBoundary = await facade.ensureBoundary({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeFile(path.join(workspaceRoot, "diagram.md"), "diagram\n");
    await facade.ensureBoundary({
      stage: "diagram_modules",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    const restored = await facade.restoreBoundary({
      cleanPaths: ["diagram.md"],
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(restored.boundaryHash, virtualBoundary.boundaryHash);
    assert.deepEqual(restored.prunedStages, [
      "virtual_simulation",
      "diagram_modules",
    ]);
    assert.equal(
      await readFile(path.join(workspaceRoot, "description.md"), "utf8"),
      "description\n"
    );
    assert.equal(
      await readFile(path.join(workspaceRoot, "virtual.md"), "utf8"),
      "virtual\n"
    );
    await assert.rejects(
      readFile(path.join(workspaceRoot, "diagram.md"), "utf8")
    );
    const registryJson = JSON.parse(
      await readFile(descriptionBoundary.registryPath, "utf8")
    );
    assert.deepEqual(
      registryJson.entries.map(
        (entry: { readonly stage: string }) => entry.stage
      ),
      ["description"]
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
