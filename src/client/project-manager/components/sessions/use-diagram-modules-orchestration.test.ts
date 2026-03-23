import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readDiagramModulesProgressSnapshot } from "../../../../../packages/core/src/remote-bridge/handlers/diagram-modules-progress";
import { buildDiagramModulesSkeletonFromIndex, loadDiagramModulesProgressiveResult } from "../diagram-editor/diagram-modules-progressive-model";

const ORCHESTRATION_SOURCE_PATH = path.resolve(process.cwd(), "src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts");

const createProductPartsIndex = (): string =>
  [
    "# Product Parts Index",
    "",
    "## Metadata",
    "- Version: 1",
    "- Stage: diagram_modules",
    "- Revision: 00000000",
    "- Updated: 2026-03-23T00:00:00Z",
    "",
    "## Product Parts",
    "",
    "### Product Part: local-core-runtime",
    "- Id: local-core-runtime",
    "- Title: Local Core Runtime",
    "- Purpose: Runs the main local orchestration.",
    "- Status: planned",
    "",
    "### Product Part: project-manager-ui",
    "- Id: project-manager-ui",
    "- Title: Project Manager UI",
    "- Purpose: Shows the staged diagram workflow to the user.",
    "- Status: planned",
  ].join("\n");

const createCanonicalOrderIndex = (): string =>
  [
    "# Product Parts Index",
    "",
    "## Canonical order",
    "",
    "1. `local-core-runtime` — `Local Core Runtime`",
    "   - Purpose: Runs the main local orchestration.",
    "",
    "2. `project-manager-ui` — `Project Manager UI`",
    "   - Purpose: Shows the staged diagram workflow to the user.",
  ].join("\n");

const createCanonicalTableIndex = (): string =>
  [
    "# Product Parts Index",
    "",
    "## Canonical Product Parts",
    "",
    "| Order | Part ID | Product Part | Purpose |",
    "| --- | --- | --- | --- |",
    "| 1 | `local-core-runtime` | `Local Core Runtime` | Runs the main local orchestration. |",
    "| 2 | `project-manager-ui` | `Project Manager UI` | Shows the staged diagram workflow to the user. |",
  ].join("\n");

const createOutlineProductPartFile = (): string =>
  [
    "# Product Part: VS Code Extension Shell",
    "",
    "- `part_id`: `vscode-extension-shell`",
    "- `index_order`: `1`",
    "",
    "## Purpose",
    "",
    "`VS Code Extension Shell` is the distribution-and-settings shell of the product.",
    "It owns installation, first launch, desktop handoff into `Project Manager`, and global/provider configuration surfaces.",
    "",
    "## Cluster Inventory",
    "",
    "### 1. `shell-bootstrap-and-environment-preparation`",
    "",
    "**Purpose:** turn the extension installation into a runnable local product setup and provide a clear standalone launch path into `Project Manager`.",
    "",
    "| Module ID | Module | Purpose |",
    "| --- | --- | --- |",
    "| `environment-preparation` | `Environment preparation` | Prepare the local environment and required local components during installation and first launch. |",
    "| `dependency-bootstrap` | `Dependency bootstrap` | Pull the dependencies needed for the rest of the product to run locally. |",
    "| `desktop-launch-entrypoint` | `Desktop launch entrypoint` | Create and maintain the standalone launch path or desktop shortcut for `Project Manager`. |",
    "",
    "## Direct Standalone Modules Under This Part",
    "",
    "- None at the current evidence level. The part currently resolves cleanly into the cluster above.",
  ].join("\n");

test("diagram modules orchestration refreshes workflow state after turn_completed without structured_output", async () => {
  const source = await readFile(ORCHESTRATION_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('artifact !== null || eventType === "turn_completed"'),
    true,
    "turn_completed must trigger a workflow-state refresh even when no structured_output is present"
  );
  assert.equal(
    source.includes('if (eventType === "turn_failed") {'),
    true,
    "turn_failed must unlock the sequence instead of leaving the hidden staged flow blocked"
  );
});

test("diagram modules progress snapshot points to next product part after index-only direct file write", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-file-change-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    const indexPath = path.join(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`
    );
    await mkdir(path.dirname(indexPath), { recursive: true });
    await writeFile(indexPath, `${createProductPartsIndex()}\n`, {
      encoding: "utf8",
      flag: "w",
    });

    const snapshot = await readDiagramModulesProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });

    assert.notEqual(snapshot, null);
    assert.equal(snapshot?.substep, "generate_product_part");
    assert.equal(snapshot?.plannedCount, 2);
    assert.equal(snapshot?.generatedCount, 0);
    assert.equal(snapshot?.currentPartId, "local-core-runtime");
    assert.equal(snapshot?.aggregateReady, false);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("diagram modules progressive skeleton parses the numbered canonical order format", () => {
  const model = buildDiagramModulesSkeletonFromIndex(createCanonicalOrderIndex());
  const productParts = model.productParts ?? [];

  assert.equal(productParts.length, 2);
  assert.deepEqual(
    productParts.map((part) => ({
      id: part.id,
      title: part.title,
      purpose: part.purpose,
    })),
    [
      {
        id: "local-core-runtime",
        title: "Local Core Runtime",
        purpose: "Runs the main local orchestration.",
      },
      {
        id: "project-manager-ui",
        title: "Project Manager UI",
        purpose: "Shows the staged diagram workflow to the user.",
      },
    ]
  );
});

test("diagram modules progress snapshot also reads the numbered canonical order format", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-canonical-order-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    const indexPath = path.join(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`
    );
    await mkdir(path.dirname(indexPath), { recursive: true });
    await writeFile(indexPath, `${createCanonicalOrderIndex()}\n`, {
      encoding: "utf8",
      flag: "w",
    });

    const snapshot = await readDiagramModulesProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });

    assert.notEqual(snapshot, null);
    assert.equal(snapshot?.substep, "generate_product_part");
    assert.equal(snapshot?.plannedCount, 2);
    assert.equal(snapshot?.generatedCount, 0);
    assert.equal(snapshot?.currentPartId, "local-core-runtime");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("diagram modules progressive skeleton parses the canonical product parts table format", () => {
  const model = buildDiagramModulesSkeletonFromIndex(createCanonicalTableIndex());
  const productParts = model.productParts ?? [];

  assert.equal(productParts.length, 2);
  assert.deepEqual(
    productParts.map((part) => ({
      id: part.id,
      title: part.title,
      purpose: part.purpose,
    })),
    [
      {
        id: "local-core-runtime",
        title: "Local Core Runtime",
        purpose: "Runs the main local orchestration.",
      },
      {
        id: "project-manager-ui",
        title: "Project Manager UI",
        purpose: "Shows the staged diagram workflow to the user.",
      },
    ]
  );
});

test("diagram modules progress snapshot also reads the canonical product parts table format", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-canonical-table-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    const indexPath = path.join(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`
    );
    await mkdir(path.dirname(indexPath), { recursive: true });
    await writeFile(indexPath, `${createCanonicalTableIndex()}\n`, {
      encoding: "utf8",
      flag: "w",
    });

    const snapshot = await readDiagramModulesProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });

    assert.notEqual(snapshot, null);
    assert.equal(snapshot?.substep, "generate_product_part");
    assert.equal(snapshot?.plannedCount, 2);
    assert.equal(snapshot?.generatedCount, 0);
    assert.equal(snapshot?.currentPartId, "local-core-runtime");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("diagram modules progressive loader parses the live outline product part format", async () => {
  const workspaceSlug = "demo-workspace";
  const result = await loadDiagramModulesProgressiveResult({
    workspaceSlug,
    flowSidecarPath: `.codeai-hub/${workspaceSlug}/diagram_modules/module-map.flow.json`,
    readArtifact: async (artifactPath) => {
      if (artifactPath.endsWith("product-parts.index.md")) {
        return {
          status: "ok",
          content: createCanonicalTableIndex().replace(
            "local-core-runtime",
            "vscode-extension-shell"
          ).replace("Local Core Runtime", "VS Code Extension Shell"),
        } as const;
      }
      if (artifactPath.endsWith("product-parts/vscode-extension-shell.md")) {
        return { status: "ok", content: createOutlineProductPartFile() } as const;
      }
      return { status: "missing" } as const;
    },
  });

  assert.equal(result.status, "ready");
  if (result.status !== "ready" || result.model.stage !== "diagram_modules") {
    assert.fail("expected a ready diagram modules model");
  }

  assert.deepEqual((result.model.clusters ?? []).map((cluster) => cluster.id), ["shell-bootstrap-and-environment-preparation"]);
  assert.deepEqual(
    result.model.modules.map((module) => module.id).sort(),
    [
      "dependency-bootstrap",
      "desktop-launch-entrypoint",
      "environment-preparation",
    ]
  );
  assert.equal(
    result.model.productParts?.find((part) => part.id === "vscode-extension-shell")
      ?.clusterIds[0],
    "shell-bootstrap-and-environment-preparation"
  );
});
