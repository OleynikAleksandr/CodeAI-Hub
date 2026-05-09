import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildManagedWorkflowContextBundle } from "./session-request-handler-managed-context-bundle";

const ACCEPTED_COMMITS_RE = /Accepted commits recorded: 1/u;
const ACTIVE_PLAN_TEXT_RE = /Active Stage Todo Plan Text/u;
const BUNDLE_TITLE_RE = /Managed Workflow Context Bundle/u;
const CURRENT_TASK_RE = /Current task: application-skeleton/u;
const DESCRIPTION_RE = /Embedded description/u;
const FIRST_READ_RE = /First read/u;
const PLAN_STATUS_COMMAND_RE = /npm run plan:status/u;
const PRODUCT_PART_RE = /Product Part: project-manager/u;

const write = async (
  root: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

test("managed context bundle embeds plans, source artifacts, and derived plan status", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "managed-context-bundle-"));
  try {
    await write(
      root,
      "doc/TODO/workspace.plan.md",
      `# Managed Workspace Plan

<!-- codeai-workspace-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-workspace-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "activeStage": "application_skeleton",
  "activePlanPath": "doc/TODO/stages/application-skeleton/todo-plan.md",
  "acceptedCommits": ["abc123"]
}
\`\`\`
<!-- codeai-workspace-plan-state:end -->
`
    );
    await write(
      root,
      "doc/TODO/stages/application-skeleton/todo-plan.md",
      `# Managed Workspace TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "currentTaskId": "application-skeleton.stream1.task1",
  "expectedCommitMessage": "docs: draft application skeleton contract",
  "lastRecordedCommit": "abc123"
}
\`\`\`
<!-- codeai-plan-state:end -->
`
    );
    await write(
      root,
      ".codeai-hub/demo/description/Final_Description.md",
      "# Final Description\nEmbedded description."
    );
    await write(
      root,
      ".codeai-hub/demo/virtual_simulation/virtual-simulation.md",
      "# Virtual Simulation\nEmbedded simulation."
    );
    await write(
      root,
      ".codeai-hub/demo/diagram_modules/product-parts.index.md",
      "# Product Parts\n- project-manager"
    );
    await write(
      root,
      ".codeai-hub/demo/diagram_modules/product-parts/project-manager.md",
      "# Product Part: project-manager"
    );

    const bundle = await buildManagedWorkflowContextBundle({
      createdAtIso: "2026-05-09T00:00:00.000Z",
      lastUserVisibleAssistantMessage: "Previous assistant text",
      modelBinding: null,
      providerId: "claudeCodeCli",
      rolloverId: "rollover",
      runSlug: null,
      sourceSessionId: "source",
      stageId: "application_skeleton",
      targetSessionId: "target",
      workspacePath: root,
      workspaceSlug: "demo",
    });

    assert.ok(bundle);
    assert.equal(bundle.sourceArtifactCount, 4);
    assert.match(bundle.rendered, BUNDLE_TITLE_RE);
    assert.match(bundle.rendered, DESCRIPTION_RE);
    assert.match(bundle.rendered, PRODUCT_PART_RE);
    assert.match(bundle.rendered, ACTIVE_PLAN_TEXT_RE);
    assert.match(bundle.planStatusText, CURRENT_TASK_RE);
    assert.match(bundle.planStatusText, ACCEPTED_COMMITS_RE);
    assert.doesNotMatch(bundle.rendered, FIRST_READ_RE);
    assert.doesNotMatch(bundle.rendered, PLAN_STATUS_COMMAND_RE);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
