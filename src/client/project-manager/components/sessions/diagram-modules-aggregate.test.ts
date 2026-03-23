import assert from "node:assert/strict";
import test from "node:test";
import { composeDiagramModulesAggregate } from "./diagram-modules-aggregate";

const WORKSPACE_SLUG = "demo-workspace";
const WORKSPACE_PATH = "/tmp/demo-workspace";

const jsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const createCanonicalTableIndex = (): string =>
  [
    "# Product Parts Index",
    "",
    "## Canonical Product Parts",
    "",
    "| Order | Part ID | Product Part | Purpose |",
    "| --- | --- | --- | --- |",
    "| 1 | `local-core-runtime` | `Local Core Runtime` | Runs the main local orchestration. |",
  ].join("\n");

const createOutlineProductPartFile = (): string =>
  [
    "# Product Part: Local Core Runtime",
    "",
    "- `part_id`: `local-core-runtime`",
    "- `index_order`: `1`",
    "",
    "## Purpose",
    "",
    "`Local Core Runtime` owns the long-running local orchestration and stateful workflow execution.",
    "",
    "## Cluster Inventory",
    "",
    "### 1. `runtime-orchestration`",
    "",
    "**Purpose:** Coordinates workflow execution and staged progress.",
    "",
    "| Module ID | Module | Purpose |",
    "| --- | --- | --- |",
    "| `workflow-step-runner` | `Workflow Step Runner` | Executes the active workflow step. |",
    "| `workflow-state-store` | `Workflow State Store` | Persists staged progress. |",
    "",
    "## Direct Standalone Modules Under This Part",
    "",
    "| Module ID | Module | Purpose |",
    "| --- | --- | --- |",
    "| `provider-session-bridge` | `Provider Session Bridge` | Connects provider turns with runtime sessions. |",
  ].join("\n");

test("diagram modules aggregate composer builds module-inventory from outline staged product part files", async () => {
  const originalFetch = globalThis.fetch;
  let writtenPath: string | null = null;
  let writtenContent: string | null = null;

  globalThis.fetch = (async (input, init) => {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const url = new URL(requestUrl);
    if (url.pathname.endsWith("/workflow-artifact")) {
      const artifactPath = url.searchParams.get("path");
      if (artifactPath?.endsWith("product-parts.index.md")) {
        return jsonResponse({ content: createCanonicalTableIndex() });
      }
      if (artifactPath?.endsWith("product-parts/local-core-runtime.md")) {
        return jsonResponse({ content: createOutlineProductPartFile() });
      }
      return new Response("missing", { status: 404 });
    }

    if (url.pathname.endsWith("/workspace-session")) {
      return jsonResponse({ sessionId: "session-1" });
    }

    if (url.pathname.endsWith("/workspace-file-write")) {
      const body =
        typeof init?.body === "string"
          ? (JSON.parse(init.body) as { path?: string; content?: string })
          : {};
      writtenPath = body.path ?? null;
      writtenContent = body.content ?? null;
      return jsonResponse({ ok: true });
    }

    return new Response("unexpected", { status: 500 });
  }) as typeof fetch;

  try {
    const result = await composeDiagramModulesAggregate({
      httpUrl: "http://localhost:3000",
      workspacePath: WORKSPACE_PATH,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(
      writtenPath,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/module-inventory.md`
    );
    assert.notEqual(writtenContent, null);
    if (writtenContent === null) {
      assert.fail("expected aggregate content to be written");
    }
    const aggregateContent: string = writtenContent;
    assert.equal(
      aggregateContent.includes("### Product Part: local-core-runtime"),
      true
    );
    assert.equal(
      aggregateContent.includes("### Cluster: runtime-orchestration"),
      true
    );
    assert.equal(
      aggregateContent.includes("#### Module: workflow-step-runner"),
      true
    );
    assert.equal(
      aggregateContent.includes("### Module: provider-session-bridge"),
      true
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
