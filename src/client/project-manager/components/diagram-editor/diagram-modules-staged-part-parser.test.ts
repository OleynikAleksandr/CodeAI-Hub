import assert from "node:assert/strict";
import test from "node:test";
import { materializeModuleMapFromStagedProductPart } from "./diagram-modules-staged-part-parser";

const TWO_COLUMN_PRODUCT_PART = `# Product Part: Standalone Project Manager

## Identity

| Field | Value |
| --- | --- |
| Part ID | \`standalone-project-manager\` |
| Product Part | Standalone Project Manager |

## Purpose

Hosts the standalone CEF-based project management UI.

## Owned Clusters

### \`ui-workspace\`

**Purpose:** Manages workspace tree and catalog browsing.

| \`module-id\` | Responsibility |
| --- | --- |
| \`workspace-catalog-browser\` | Browses the workspace catalog entries |
| \`workspace-tree-view\` | Renders the hierarchical workspace tree |
| \`workspace-search\` | Provides workspace-wide search capability |

### \`data-layer\`

**Purpose:** Persists and retrieves project data.

| \`module-id\` | Responsibility |
| --- | --- |
| \`project-store\` | Stores project state and metadata |
| \`artifact-cache\` | Caches compiled artifacts for fast access |

## Standalone Modules

| \`module-id\` | Responsibility |
| --- | --- |
| \`provider-session-bridge\` | Connects provider turns with the runtime session lifecycle |
`;

test("parses 2-column outline tables without phantom header match", () => {
  const result = materializeModuleMapFromStagedProductPart(TWO_COLUMN_PRODUCT_PART);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const { modules, clusters } = result.value;

  // No phantom "module-id" entry from the header row
  assert.equal(modules.find((m) => m.id === "module-id"), undefined, "phantom header row must be filtered");

  // Cluster ui-workspace: 3 modules
  const uiCluster = clusters?.find((c) => c.id === "ui-workspace");
  assert.ok(uiCluster, "ui-workspace cluster must exist");
  assert.equal(uiCluster.moduleIds.length, 3, "ui-workspace must have exactly 3 modules");

  // Cluster data-layer: 2 modules
  const dataCluster = clusters?.find((c) => c.id === "data-layer");
  assert.ok(dataCluster, "data-layer cluster must exist");
  assert.equal(dataCluster.moduleIds.length, 2, "data-layer must have exactly 2 modules");

  // Standalone: 1 module
  const standalone = modules.filter((m) => !m.cluster);
  assert.equal(standalone.length, 1, "must have exactly 1 standalone module");
  assert.equal(standalone[0]?.id, "provider-session-bridge");
});

test("2-column table uses humanized module-id as title", () => {
  const result = materializeModuleMapFromStagedProductPart(TWO_COLUMN_PRODUCT_PART);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const { modules } = result.value;

  const browser = modules.find((m) => m.id === "workspace-catalog-browser");
  assert.ok(browser, "workspace-catalog-browser must exist");
  assert.equal(browser.title, "Workspace Catalog Browser");

  const treeView = modules.find((m) => m.id === "workspace-tree-view");
  assert.ok(treeView, "workspace-tree-view must exist");
  assert.equal(treeView.title, "Workspace Tree View");

  const store = modules.find((m) => m.id === "project-store");
  assert.ok(store, "project-store must exist");
  assert.equal(store.title, "Project Store");

  const bridge = modules.find((m) => m.id === "provider-session-bridge");
  assert.ok(bridge, "provider-session-bridge must exist");
  assert.equal(bridge.title, "Provider Session Bridge");
});

test("2-column table preserves responsibility text verbatim", () => {
  const result = materializeModuleMapFromStagedProductPart(TWO_COLUMN_PRODUCT_PART);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const browser = result.value.modules.find((m) => m.id === "workspace-catalog-browser");
  assert.ok(browser, "workspace-catalog-browser must exist");
  assert.equal(browser.responsibility, "Browses the workspace catalog entries");
});

test("cluster header without `Cluster:` prefix is still parsed", () => {
  const content = `# Product Part: Bare Cluster Part

## Identity

| Field | Value |
| --- | --- |
| Part ID | \`bare-cluster-part\` |
| Product Part | Bare Cluster Part |

## Purpose

Test bare cluster header form.

## Owned Clusters

### \`bare-cluster\`

**Purpose:** Canonical template form without the \`Cluster:\` prefix.

| \`module-id\` | Responsibility |
| --- | --- |
| \`bare-module\` | Does bare work |
`;

  const result = materializeModuleMapFromStagedProductPart(content);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const cluster = result.value.clusters?.find((c) => c.id === "bare-cluster");
  assert.ok(cluster, "bare-cluster must be recognized");
  assert.equal(cluster.moduleIds.length, 1);
  assert.equal(cluster.moduleIds[0], "bare-module");
});
