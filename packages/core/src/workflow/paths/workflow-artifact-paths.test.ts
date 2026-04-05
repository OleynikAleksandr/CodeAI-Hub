import assert from "node:assert/strict";
import test from "node:test";
import { resolveWorkflowArtifactPaths } from "./workflow-artifact-paths";

const WORKSPACE_ROOT = "/tmp/workspace";

test("resolveWorkflowArtifactPaths resolves diagram modules index path", () => {
  const result = resolveWorkflowArtifactPaths({
    workspaceRoot: WORKSPACE_ROOT,
    workspaceSlug: "demo-workspace",
    stage: "diagram_modules",
    fileName: "product-parts.index.md",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(
    result.value.relativePath,
    ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md"
  );
});

test("resolveWorkflowArtifactPaths resolves diagram modules product part path", () => {
  const result = resolveWorkflowArtifactPaths({
    workspaceRoot: WORKSPACE_ROOT,
    workspaceSlug: "demo-workspace",
    stage: "diagram_modules",
    fileName: "product-part.md",
    partId: "local-core-runtime",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(
    result.value.relativePath,
    ".codeai-hub/demo-workspace/diagram_modules/product-parts/local-core-runtime.md"
  );
  assert.equal(result.value.partId, "local-core-runtime");
});

test("resolveWorkflowArtifactPaths rejects diagram modules product part without partId", () => {
  const result = resolveWorkflowArtifactPaths({
    workspaceRoot: WORKSPACE_ROOT,
    workspaceSlug: "demo-workspace",
    stage: "diagram_modules",
    fileName: "product-part.md",
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.error, "Invalid product part path parameters");
});

test("resolveWorkflowArtifactPaths resolves foundation envelope path", () => {
  const result = resolveWorkflowArtifactPaths({
    workspaceRoot: WORKSPACE_ROOT,
    workspaceSlug: "demo-workspace",
    stage: "foundation_envelope",
    fileName: "foundation-envelope.md",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(
    result.value.relativePath,
    ".codeai-hub/demo-workspace/foundation_envelope/foundation-envelope.md"
  );
});
