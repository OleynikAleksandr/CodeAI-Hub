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
  "currentTaskId": "application-skeleton.phase1a.draft.task1",
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

const QUALITY_GATES_BUNDLE_TITLE_RE = /Managed Workflow Context Bundle/u;
const QUALITY_GATES_ACTIVE_PLAN_TEXT_RE = /Active Stage Todo Plan Text/u;
const QUALITY_GATES_CURRENT_TASK_RE = /Current task: quality-gates/u;
const QUALITY_GATES_ARTIFACT_RE = /Source Artifact: quality-gates\.md/u;

test("managed context bundle embeds Quality Gates plan, sources, and current microtask state", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "managed-context-bundle-qg-"));
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
  "activeStage": "quality_gates",
  "activePlanPath": "doc/TODO/stages/quality-gates/todo-plan.md",
  "acceptedCommits": ["def456"]
}
\`\`\`
<!-- codeai-workspace-plan-state:end -->
`
    );
    await write(
      root,
      "doc/TODO/stages/quality-gates/todo-plan.md",
      `# Managed Quality Gates Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "currentTaskId": "quality-gates.stream1.task1",
  "expectedCommitMessage": "docs: draft quality gates contract",
  "lastRecordedCommit": "def456"
}
\`\`\`
<!-- codeai-plan-state:end -->
`
    );
    await write(
      root,
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      "# App Skeleton"
    );
    await write(
      root,
      ".codeai-hub/demo/application_skeleton/application-skeleton-map.json",
      "{}"
    );
    await write(
      root,
      ".codeai-hub/demo/quality_gates/quality-gates.md",
      "# Quality Gates"
    );
    await write(
      root,
      ".codeai-hub/demo/quality_gates/quality-gates.json",
      '{"commands":{}}'
    );

    const bundle = await buildManagedWorkflowContextBundle({
      createdAtIso: "2026-05-09T00:00:00.000Z",
      lastUserVisibleAssistantMessage: "Previous assistant text",
      modelBinding: null,
      providerId: "codexCli",
      rolloverId: "rollover",
      runSlug: null,
      sourceSessionId: "source",
      stageId: "quality_gates",
      targetSessionId: "target",
      workspacePath: root,
      workspaceSlug: "demo",
    });

    assert.ok(bundle);
    assert.equal(bundle.sourceArtifactCount, 4);
    assert.match(bundle.rendered, QUALITY_GATES_BUNDLE_TITLE_RE);
    assert.match(bundle.rendered, QUALITY_GATES_ACTIVE_PLAN_TEXT_RE);
    assert.match(bundle.rendered, QUALITY_GATES_ARTIFACT_RE);
    assert.match(bundle.planStatusText, QUALITY_GATES_CURRENT_TASK_RE);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
