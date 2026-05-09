import assert from "node:assert/strict";
import test from "node:test";
import { buildManagedWorkflowInitialContext } from "./managed-workflow-initial-context";

const workspacePlan = `# Workspace Plan

<!-- codeai-workspace-plan-state:start -->
\`\`\`json
{
  "activeStage": "application_skeleton",
  "activePlanPath": "doc/TODO/stages/application-skeleton/todo-plan.md"
}
\`\`\`
<!-- codeai-workspace-plan-state:end -->
`;

const stagePlan = `# Stage Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "executionScopeStatus": "ACTIVE",
  "currentTaskId": "application-skeleton.stream1.task1",
  "expectedCommitMessage": "docs: draft application skeleton contract",
  "lastRecordedCommit": "abc123"
}
\`\`\`
<!-- codeai-plan-state:end -->
`;

test("initial managed workflow context embeds plan text and active stage status", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const responses = new Map([
    ["doc/TODO/workspace.plan.md", workspacePlan],
    ["doc/TODO/stages/application-skeleton/todo-plan.md", stagePlan],
  ]);
  globalThis.window = {
    codeaiBridgeConfig: { httpUrl: "http://core.test" },
  } as unknown as Window & typeof globalThis;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const content = responses.get(url.searchParams.get("path") ?? "");
    return {
      ok: Boolean(content),
      json: async () => ({ content }),
    } as Response;
  }) as typeof fetch;

  try {
    const context = await buildManagedWorkflowInitialContext({
      providerId: "codexCli",
      stage: "application_skeleton",
      workspacePath: "/tmp/workspace",
      workspaceSlug: "demo",
    });

    assert.ok(context);
    assert.match(context, /## Managed Workflow Context Bundle/u);
    assert.match(context, /activeStage: "application_skeleton"/u);
    assert.match(context, /Expected commit: docs: draft application skeleton contract/u);
    assert.match(context, /Current provider: codexCli/u);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test("pre-managed workflow stages do not receive managed context", async () => {
  const context = await buildManagedWorkflowInitialContext({
    stage: "description",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo",
  });

  assert.equal(context, null);
});
