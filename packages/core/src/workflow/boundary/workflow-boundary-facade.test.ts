import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { sanitizeWorkspaceSlug } from "@codeai-hub/unified-session";
import { WorkflowBoundaryFacade } from "./workflow-boundary-facade";
import { captureWorkflowRuntimeSlices } from "./workflow-runtime-slice-snapshot";

const WORKSPACE_SLUG = "demo-workspace";

const createWorkspace = async (): Promise<string> =>
  await mkdtemp(path.join(tmpdir(), "codeai-boundary-"));

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

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

test("WorkflowBoundaryFacade restores runtime session slices from selected boundary", async () => {
  const workspaceRoot = await createWorkspace();
  const homeDirectory = await mkdtemp(path.join(tmpdir(), "codeai-home-"));
  const previousHome = process.env.HOME;
  const sessionPath = path.join(
    homeDirectory,
    ".codeai-hub",
    "sessions",
    sanitizeWorkspaceSlug(workspaceRoot),
    "codex",
    "description.jsonl"
  );
  try {
    process.env.HOME = homeDirectory;
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
    });
    await writeText(
      path.join(workspaceRoot, "description.md"),
      "description\n"
    );
    await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(sessionPath, "description-session\n");
    await captureWorkflowRuntimeSlices({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const virtualBoundary = await facade.ensureBoundary({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(sessionPath, "virtual-session\n");
    await writeText(path.join(workspaceRoot, "virtual.md"), "virtual\n");

    const restored = await facade.restoreBoundary({
      cleanPaths: ["virtual.md"],
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(restored.boundaryHash, virtualBoundary.boundaryHash);
    assert.equal(await readFile(sessionPath, "utf8"), "description-session\n");
    await assert.rejects(
      readFile(path.join(workspaceRoot, "virtual.md"), "utf8")
    );
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(homeDirectory, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
