import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readDiagramModulesProgressSnapshot } from "./diagram-modules-progress";

const PRODUCT_PART_MISSING_FILE_RE = /Product Part artifact file is missing\./u;
const PRODUCT_PART_HEADER_ERROR_RE =
  /missing '# Module Inventory' or '# Product Part:' header/u;

test("Diagram Modules progress preserves per-part validation diagnostics", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-progress-diagnostics-")
  );

  try {
    await mkdir(
      path.join(workspaceRoot, ".codeai-hub/demo-workspace/diagram_modules"),
      { recursive: true }
    );
    await writeFile(
      path.join(
        workspaceRoot,
        ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md"
      ),
      [
        "# Product Parts Index",
        "",
        "### Product Part: local-runtime",
        "",
        "### Product Part: provider-runtime",
        "",
      ].join("\n"),
      "utf8"
    );
    await mkdir(
      path.join(
        workspaceRoot,
        ".codeai-hub/demo-workspace/diagram_modules/product-parts"
      ),
      { recursive: true }
    );
    await writeFile(
      path.join(
        workspaceRoot,
        ".codeai-hub/demo-workspace/diagram_modules/product-parts/provider-runtime.md"
      ),
      "# Wrong Header\n",
      "utf8"
    );

    const progress = await readDiagramModulesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(progress?.aggregateReady, false);
    assert.deepEqual(progress?.acceptedPartIds, []);
    assert.deepEqual(progress?.activeSubturn, {
      kind: "product_part",
      partId: "local-runtime",
      status: "pending",
    });
    assert.equal(
      progress?.expectedArtifactPath?.endsWith(
        "diagram_modules/product-parts/local-runtime.md"
      ),
      true
    );
    assert.equal(
      progress?.lastValidation?.validator,
      "diagram_modules.product_part"
    );
    assert.equal(progress?.lastValidation?.valid, false);
    assert.equal(progress?.nextPartId, "local-runtime");
    assert.deepEqual(progress?.generatedPartIds, []);
    assert.equal(progress?.productPartDiagnostics?.length, 2);
    assert.match(
      progress?.productPartDiagnostics?.[0]?.error ?? "",
      PRODUCT_PART_MISSING_FILE_RE
    );
    assert.match(
      progress?.productPartDiagnostics?.[1]?.error ?? "",
      PRODUCT_PART_HEADER_ERROR_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Diagram Modules progress exposes aggregate accepted subturn when every Product Part is valid", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-progress-accepted-")
  );

  try {
    await mkdir(
      path.join(
        workspaceRoot,
        ".codeai-hub/demo-workspace/diagram_modules/product-parts"
      ),
      { recursive: true }
    );
    await writeFile(
      path.join(
        workspaceRoot,
        ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md"
      ),
      [
        "# Product Parts Index",
        "",
        "### Product Part: local-runtime",
        "- Id: local-runtime",
        "- Title: Local Runtime",
        "- Purpose: Runs local orchestration.",
        "- Status: generated",
        "",
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      path.join(
        workspaceRoot,
        ".codeai-hub/demo-workspace/diagram_modules/product-parts/local-runtime.md"
      ),
      [
        "# Product Part: Local Runtime",
        "",
        "## Identity",
        "",
        "| Field | Value |",
        "| --- | --- |",
        "| Part ID | `local-runtime` |",
        "| Product Part | `Local Runtime` |",
        "| Purpose | Runs local orchestration. |",
        "",
        "## Purpose",
        "",
        "Runs local orchestration.",
        "",
        "## Owned Clusters",
        "",
        "### `runtime-core`",
        "",
        "**Purpose:** Coordinates runtime execution.",
        "",
        "| `module-id` | Responsibility |",
        "| --- | --- |",
        "| `workflow-runner` | Runs workflow turns. |",
        "",
      ].join("\n"),
      "utf8"
    );

    const progress = await readDiagramModulesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(progress?.aggregateReady, true);
    assert.deepEqual(progress?.acceptedPartIds, ["local-runtime"]);
    assert.deepEqual(progress?.activeSubturn, {
      kind: "aggregate",
      status: "accepted",
    });
    assert.equal(progress?.expectedArtifactPath, null);
    assert.equal(
      progress?.lastValidation?.validator,
      "diagram_modules.aggregate"
    );
    assert.equal(progress?.lastValidation?.valid, true);
    assert.equal(progress?.nextPartId, null);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
