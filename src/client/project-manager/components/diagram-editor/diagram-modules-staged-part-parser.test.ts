import assert from "node:assert/strict";
import test from "node:test";
import { materializeModuleMapFromStagedProductPart } from "./diagram-modules-staged-part-parser";

const THREE_COL_PRODUCT_PART = `# Product Part: Standalone Project Manager

## Identity

| Field | Value |
| --- | --- |
| Part ID | \`standalone-project-manager\` |
| Product Part | Standalone Project Manager |

## Purpose

Hosts the standalone CEF-based project management UI.

## Owned Clusters

### Cluster: \`ui-workspace\`

**Purpose:** Manages workspace tree and catalog browsing.

| \`module-id\` | \`kind\` | Responsibility |
| --- | --- | --- |
| \`workspace-catalog-browser\` | \`service\` | Browses the workspace catalog entries |
| \`workspace-tree-view\` | \`ui\` | Renders the hierarchical workspace tree |
| \`workspace-search\` | \`service\` | Provides workspace-wide search capability |

### Cluster: \`data-layer\`

**Purpose:** Persists and retrieves project data.

| \`module-id\` | \`kind\` | Responsibility |
| --- | --- | --- |
| \`project-store\` | \`store\` | Stores project state and metadata |
| \`artifact-cache\` | \`service\` | Caches compiled artifacts for fast access |

## Direct Standalone Modules Under This Part

| \`module-id\` | \`kind\` | Responsibility |
| --- | --- | --- |
| \`provider-session-bridge\` | \`adapter\` | Connects provider turns with the runtime session lifecycle |
`;

test("parses 3-column outline table without phantom header match", () => {
  const result = materializeModuleMapFromStagedProductPart(THREE_COL_PRODUCT_PART);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const { modules, clusters } = result.value;

  // No phantom "module-id" entry
  assert.equal(modules.find((m) => m.id === "module-id"), undefined, "phantom header row must be filtered");

  // Cluster ui-workspace: 3 modules (not N-1 or N+1)
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

test("3-column table uses humanized module-id as title instead of kind", () => {
  const result = materializeModuleMapFromStagedProductPart(THREE_COL_PRODUCT_PART);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const { modules } = result.value;

  const browser = modules.find((m) => m.id === "workspace-catalog-browser");
  assert.ok(browser, "workspace-catalog-browser must exist");
  assert.equal(browser.title, "Workspace Catalog Browser", "title must be humanized from module-id, not kind");
  assert.equal(browser.kind, "service", "kind must be preserved from col2");
  assert.notEqual(browser.title, "service", "title must NOT be the kind value");

  const treeView = modules.find((m) => m.id === "workspace-tree-view");
  assert.ok(treeView, "workspace-tree-view must exist");
  assert.equal(treeView.title, "Workspace Tree View");

  const store = modules.find((m) => m.id === "project-store");
  assert.ok(store, "project-store must exist");
  assert.equal(store.title, "Project Store");
  assert.equal(store.kind, "store", "kind must be preserved from col2");

  const bridge = modules.find((m) => m.id === "provider-session-bridge");
  assert.ok(bridge, "provider-session-bridge must exist");
  assert.equal(bridge.kind, "adapter", "standalone module kind must be preserved");
});

test("responsibility with pipe inside backticks is not truncated", () => {
  const content = `# Product Part: Core Part

## Identity

| Field | Value |
| --- | --- |
| Part ID | \`core-part\` |
| Product Part | Core Part |

## Purpose

Core purpose.

## Owned Clusters

### Cluster: \`orchestration\`

**Purpose:** Orchestrates workflow.

| \`module-id\` | \`kind\` | Responsibility |
| --- | --- | --- |
| \`turn-lifecycle-controller\` | \`service\` | Ведёт каждый turn по состояниям \`turn_started -> turn_completed|turn_failed\` и не даёт UI зависнуть в running state. |
`;

  const result = materializeModuleMapFromStagedProductPart(content);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const mod = result.value.modules.find((m) => m.id === "turn-lifecycle-controller");
  assert.ok(mod, "turn-lifecycle-controller must exist");
  assert.ok(
    mod.responsibility.includes("turn_started"),
    "responsibility must include turn_started (before pipe)"
  );
  assert.ok(
    mod.responsibility.includes("turn_failed"),
    "responsibility must include turn_failed (after pipe)"
  );
  assert.ok(
    mod.responsibility.includes("running state"),
    "responsibility must include full text after backtick expression"
  );
});

test("4-column table preserves explicit title from column 2", () => {
  const content = `# Product Part: Test Part

## Identity

| Field | Value |
| --- | --- |
| Part ID | \`test-part\` |
| Product Part | Test Part |

## Purpose

Test purpose.

## Owned Clusters

### Cluster: \`my-cluster\`

**Purpose:** Test cluster.

| \`module-id\` | \`Module Title\` | \`proposed\` | Responsibility |
| --- | --- | --- | --- |
| \`my-module\` | \`Custom Title\` | \`proposed\` | Does something |
`;

  const result = materializeModuleMapFromStagedProductPart(content);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const mod = result.value.modules.find((m) => m.id === "my-module");
  assert.ok(mod, "my-module must exist");
  assert.equal(mod.title, "Custom Title", "4-col must preserve explicit title");
});
