import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  readDiagramModulesPersistedSubturnState,
  readDiagramModulesProgressSnapshot,
  syncDiagramModulesSubturnState,
} from "./diagram-modules-progress";

const execFileAsync = promisify(execFile);
const PRODUCT_PART_MISSING_FILE_RE = /Product Part artifact file is missing\./u;
const PRODUCT_PART_HEADER_ERROR_RE =
  /Expected `# Module Inventory` title|missing '# Module Inventory' or '# Product Part:' header/u;
const LEADERSHIP_ORDER_FIRST_ITEM_ERROR_RE =
  /first productPartLeadershipOrder item must equal leadProductPartId/u;

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
        "- leadProductPartId: `local-runtime`",
        "- productPartLeadershipOrder: `local-runtime`, `provider-runtime`",
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
        "- leadProductPartId: `local-runtime`",
        "- productPartLeadershipOrder: `local-runtime`",
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

test("Diagram Modules progress keeps a dirty Product Part index on the index commit boundary", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-progress-dirty-index-")
  );

  try {
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    await mkdir(
      path.join(workspaceRoot, ".codeai-hub/demo-workspace/diagram_modules"),
      { recursive: true }
    );
    const indexPath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md"
    );
    await writeFile(
      indexPath,
      [
        "# Product Parts Index",
        "",
        "- leadProductPartId: `local-runtime`",
        "- productPartLeadershipOrder: `local-runtime`",
        "",
        "### Product Part: local-runtime",
        "- Id: local-runtime",
        "- Title: Local Runtime",
        "- Purpose: Runs local orchestration.",
        "- Status: planned",
        "",
      ].join("\n"),
      "utf8"
    );

    const dirtyProgress = await readDiagramModulesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(dirtyProgress?.substep, "index");
    assert.deepEqual(dirtyProgress?.activeSubturn, {
      kind: "index",
      status: "pending",
    });
    assert.equal(
      dirtyProgress?.expectedArtifactPath?.endsWith(
        "diagram_modules/product-parts.index.md"
      ),
      true
    );

    await git(workspaceRoot, ["add", "."]);
    await git(workspaceRoot, ["commit", "-m", "docs: commit index"]);
    const cleanProgress = await readDiagramModulesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(cleanProgress?.substep, "generate_product_part");
    assert.deepEqual(cleanProgress?.activeSubturn, {
      kind: "product_part",
      partId: "local-runtime",
      status: "pending",
    });
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Diagram Modules subturn state persists the active expected artifact for recovery", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-subturn-state-")
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
        "- leadProductPartId: `local-runtime`",
        "- productPartLeadershipOrder: `local-runtime`",
        "",
        "### Product Part: local-runtime",
        "- Id: local-runtime",
        "- Title: Local Runtime",
        "- Purpose: Runs local orchestration.",
        "- Status: planned",
        "",
      ].join("\n"),
      "utf8"
    );

    const progress = await readDiagramModulesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });
    await syncDiagramModulesSubturnState({
      progress,
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    const persisted = await readDiagramModulesPersistedSubturnState({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(persisted?.schema, "codeai-diagram-modules-subturn-v1");
    assert.deepEqual(persisted?.activeSubturn, {
      kind: "product_part",
      partId: "local-runtime",
      status: "pending",
    });
    assert.equal(persisted?.nextPartId, "local-runtime");
    assert.equal(
      persisted?.expectedArtifactPath?.endsWith(
        "diagram_modules/product-parts/local-runtime.md"
      ),
      true
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Diagram Modules progress blocks index when leadership order is invalid", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-progress-leadership-")
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
        "- leadProductPartId: `core-runtime`",
        "- productPartLeadershipOrder: `project-manager`, `core-runtime`",
        "",
        "### Product Part: core-runtime",
        "- Id: core-runtime",
        "- Title: Core Runtime",
        "- Purpose: Owns workflow truth.",
        "- Status: planned",
        "",
        "### Product Part: project-manager",
        "- Id: project-manager",
        "- Title: Project Manager",
        "- Purpose: Renders Core-owned state.",
        "- Status: planned",
        "",
      ].join("\n"),
      "utf8"
    );

    const progress = await readDiagramModulesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(progress?.substep, "index");
    assert.deepEqual(progress?.activeSubturn, {
      kind: "index",
      status: "repair_pending",
    });
    assert.equal(progress?.leadProductPartId, "core-runtime");
    assert.deepEqual(progress?.productPartLeadershipOrder, [
      "project-manager",
      "core-runtime",
    ]);
    assert.match(
      progress?.lastValidation?.diagnostics.join("\n") ?? "",
      LEADERSHIP_ORDER_FIRST_ITEM_ERROR_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

const git = async (cwd: string, args: readonly string[]): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], { cwd });
  return stdout.trim();
};
