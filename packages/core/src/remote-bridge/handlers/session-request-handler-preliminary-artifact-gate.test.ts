import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { resolvePreliminaryArtifactGate } from "./session-request-handler-preliminary-artifact-gate";

const WORKSPACE_SLUG = "demo-workspace";
const VIRTUAL_SIMULATION_ARTIFACT_PATH = `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/virtual-simulation.md`;
const VIRTUAL_SIMULATION_ARTIFACT_RE = /virtual-simulation\.md/u;
const USER_REVIEW_TAG = "managed-workflow-user-review";
const VALIDATION_TAG = "managed-workflow-validation";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

test("preliminary artifact gate allows Description handoff without Virtual Simulation artifact", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "preliminary-gate-description-")
  );
  try {
    const result = await resolvePreliminaryArtifactGate({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result?.tag, USER_REVIEW_TAG);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("preliminary artifact gate blocks Virtual Simulation handoff until canonical artifact exists", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "preliminary-gate-virtual-missing-")
  );
  try {
    const result = await resolvePreliminaryArtifactGate({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result?.tag, VALIDATION_TAG);
    assert.match(result?.content ?? "", VIRTUAL_SIMULATION_ARTIFACT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("preliminary artifact gate allows Virtual Simulation handoff with canonical artifact", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "preliminary-gate-virtual-ready-")
  );
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      VIRTUAL_SIMULATION_ARTIFACT_PATH,
      "# Virtual Simulation\n\nReady for Diagram Modules.\n"
    );

    const result = await resolvePreliminaryArtifactGate({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result?.tag, USER_REVIEW_TAG);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
