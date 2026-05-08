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
