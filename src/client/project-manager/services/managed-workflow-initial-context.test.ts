import assert from "node:assert/strict";
import test from "node:test";
import { buildManagedWorkflowInitialContext } from "./managed-workflow-initial-context";

const STUB_BUNDLE = `## Managed Workflow Context Bundle
Stage: application_skeleton
## Plan Status
activeStage: "application_skeleton"
`;

test("PM initial context returns the assembled bundle from Core endpoint verbatim", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let observedUrl: string | null = null;
  globalThis.window = {
    codeaiBridgeConfig: { httpUrl: "http://core.test" },
  } as unknown as Window & typeof globalThis;
  globalThis.fetch = ((input: RequestInfo | URL) => {
    observedUrl = String(input);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: STUB_BUNDLE, stage: "application_skeleton" }),
    } as Response);
  }) as typeof fetch;

  try {
    const context = await buildManagedWorkflowInitialContext({
      providerId: "codexCli",
      stage: "application_skeleton",
      workspacePath: "/tmp/workspace",
      workspaceSlug: "demo",
    });
    assert.equal(context, STUB_BUNDLE);
    assert.match(observedUrl ?? "", /\/api\/v1\/orchestrator\/managed-context-bundle\?/u);
    assert.match(observedUrl ?? "", /stage=application_skeleton/u);
    assert.match(observedUrl ?? "", /workspaceSlug=demo/u);
    assert.match(observedUrl ?? "", /providerId=codexCli/u);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test("PM initial context returns null for non-managed stages without HTTP fetch", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = (() => {
    fetchCalled = true;
    return Promise.resolve({ ok: false } as Response);
  }) as typeof fetch;
  try {
    const context = await buildManagedWorkflowInitialContext({
      stage: "description",
      workspacePath: "/tmp/workspace",
      workspaceSlug: "demo",
    });
    assert.equal(context, null);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("PM initial context returns null when Core endpoint fails", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  globalThis.window = {
    codeaiBridgeConfig: { httpUrl: "http://core.test" },
  } as unknown as Window & typeof globalThis;
  globalThis.fetch = (() =>
    Promise.resolve({ ok: false } as Response)) as typeof fetch;
  try {
    const context = await buildManagedWorkflowInitialContext({
      providerId: "codexCli",
      stage: "diagram_modules",
      workspacePath: "/tmp/workspace",
      workspaceSlug: "demo",
    });
    assert.equal(context, null);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});
