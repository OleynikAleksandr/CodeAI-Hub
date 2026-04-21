import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readDevelopmentTreeSnapshot } from "./development-tree-snapshot";

// Canonical two-column module table per agent template:
//   | `module-id` | Responsibility |
const PART_CONTENT = `# Product Part: UI Shell

## Identity

| Field | Value |
|-------|-------|
| Part ID | \`ui-shell\` |
| Purpose | Primary user interface shell |

## Owned Clusters

### \`layout-cluster\`

**Purpose:** Layout management.

| \`module-id\` | Responsibility |
| --- | --- |
| \`main-area\` | Core layout surface |
| \`sidebar\` | Navigation surface |

## Standalone Modules

| \`module-id\` | Responsibility |
| --- | --- |
| \`theme-engine\` | Theming |

## Simple Relations

| From | To | Type | Label |
| --- | --- | --- | --- |
| \`theme-engine\` | \`main-area\` | sync-call | apply-theme |

## Assumptions / Open Questions

- None
`;

test("readDevelopmentTreeSnapshot returns skeleton for planned-only parts", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "devtree-"));
  try {
    const result = await readDevelopmentTreeSnapshot({
      workspaceRoot: tmpDir,
      workspaceSlug: "demo",
      plannedPartIds: ["ui-shell", "core"],
      generatedPartIds: [],
    });
    assert.equal(result.parts.length, 2);
    assert.equal(result.parts[0]?.status, "skeleton");
    assert.equal(result.parts[0]?.clusters.length, 0);
    assert.equal(result.parts[1]?.status, "skeleton");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("readDevelopmentTreeSnapshot extracts clusters and standalone modules from 2-column tables", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "devtree-"));
  try {
    const partDir = path.join(
      tmpDir,
      ".codeai-hub/demo/diagram_modules/product-parts"
    );
    await mkdir(partDir, { recursive: true });
    await writeFile(path.join(partDir, "ui-shell.md"), PART_CONTENT, "utf8");

    const result = await readDevelopmentTreeSnapshot({
      workspaceRoot: tmpDir,
      workspaceSlug: "demo",
      plannedPartIds: ["ui-shell"],
      generatedPartIds: ["ui-shell"],
    });

    assert.equal(result.parts.length, 1);
    const part = result.parts[0];
    assert.ok(part);
    assert.equal(part.id, "ui-shell");
    assert.equal(part.status, "materialized");
    assert.equal(part.clusters.length, 1);
    assert.equal(part.clusters[0]?.id, "layout-cluster");
    assert.equal(part.clusters[0]?.modules.length, 2);
    assert.equal(part.clusters[0]?.modules[0]?.id, "main-area");
    assert.equal(part.clusters[0]?.modules[0]?.title, "Main Area");
    assert.equal(part.clusters[0]?.modules[1]?.id, "sidebar");
    assert.equal(part.clusters[0]?.modules[1]?.title, "Sidebar");
    assert.equal(part.standaloneModules.length, 1);
    assert.equal(part.standaloneModules[0]?.id, "theme-engine");
    assert.equal(part.standaloneModules[0]?.title, "Theme Engine");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("readDevelopmentTreeSnapshot does not leak Simple Relations rows as standalone modules", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "devtree-"));
  try {
    const partDir = path.join(
      tmpDir,
      ".codeai-hub/demo/diagram_modules/product-parts"
    );
    await mkdir(partDir, { recursive: true });
    await writeFile(path.join(partDir, "ui-shell.md"), PART_CONTENT, "utf8");

    const result = await readDevelopmentTreeSnapshot({
      workspaceRoot: tmpDir,
      workspaceSlug: "demo",
      plannedPartIds: ["ui-shell"],
      generatedPartIds: ["ui-shell"],
    });

    const standalone = result.parts[0]?.standaloneModules ?? [];
    // Only `theme-engine` is a genuine standalone module.
    // `main-area` appears in Simple Relations as the `To` endpoint but must NOT
    // be surfaced as a phantom standalone.
    assert.equal(standalone.length, 1);
    assert.equal(standalone[0]?.id, "theme-engine");
    assert.equal(
      standalone.find((m) => m.id === "main-area"),
      undefined
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// Artifact where `From` in every Simple Relations row is a cluster module id
// (not a standalone). Before the parser fix, the 4-column row was non-greedily
// matched by MODULE_ROW_RE whenever the standalone-body clamp slipped, so
// `sidebar-module` + `provider-picker` would surface as phantom standalones.
const PART_CONTENT_CLUSTER_FROM_RELATIONS = `# Product Part: Project Shell

## Identity

| Field | Value |
|-------|-------|
| Part ID | \`project-shell\` |
| Purpose | Shell surface |

## Owned Clusters

### \`ui-cluster\`

**Purpose:** UI surfaces.

| \`module-id\` | Responsibility |
| --- | --- |
| \`sidebar-module\` | Sidebar surface |
| \`artifact-view\` | Artifact surface |

### \`session-cluster\`

**Purpose:** Session controls.

| \`module-id\` | Responsibility |
| --- | --- |
| \`provider-picker\` | Provider UX |
| \`turn-composer\` | Turn composer |

## Standalone Modules

| \`module-id\` | Responsibility |
| --- | --- |
| \`cef-launcher\` | Launcher |

## Simple Relations

| From | To | Type | Label |
| --- | --- | --- | --- |
| \`sidebar-module\` | \`artifact-view\` | sync-call | open |
| \`provider-picker\` | \`turn-composer\` | sync-call | start |

## Assumptions / Open Questions

- None
`;

test("readDevelopmentTreeSnapshot stays stable on repeated invocations (lastIndex drift guard)", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "devtree-"));
  try {
    const partDir = path.join(
      tmpDir,
      ".codeai-hub/demo/diagram_modules/product-parts"
    );
    await mkdir(partDir, { recursive: true });
    await writeFile(
      path.join(partDir, "project-shell.md"),
      PART_CONTENT_CLUSTER_FROM_RELATIONS,
      "utf8"
    );

    // Invoke the parser 10 times on the same artifact. Prior to the fix,
    // NEXT_SECTION_RE.lastIndex accumulated between calls in the module-level
    // regex singleton and produced alternating hit/null results, so some
    // invocations surfaced 3 phantom standalone modules (`sidebar-module`,
    // `provider-picker`, `cef-launcher`) and some returned the correct one.
    const runs: string[][] = [];
    for (let i = 0; i < 10; i++) {
      const snapshot = await readDevelopmentTreeSnapshot({
        workspaceRoot: tmpDir,
        workspaceSlug: "demo",
        plannedPartIds: ["project-shell"],
        generatedPartIds: ["project-shell"],
      });
      const standaloneIds =
        snapshot.parts[0]?.standaloneModules.map((m) => m.id) ?? [];
      runs.push(standaloneIds);
    }

    const referenceRun = runs[0];
    assert.ok(referenceRun);
    assert.deepEqual(referenceRun, ["cef-launcher"]);
    for (const run of runs) {
      assert.deepEqual(run, referenceRun);
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("readDevelopmentTreeSnapshot keeps cluster modules out of standalone when they appear as `From` in Simple Relations", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "devtree-"));
  try {
    const partDir = path.join(
      tmpDir,
      ".codeai-hub/demo/diagram_modules/product-parts"
    );
    await mkdir(partDir, { recursive: true });
    await writeFile(
      path.join(partDir, "project-shell.md"),
      PART_CONTENT_CLUSTER_FROM_RELATIONS,
      "utf8"
    );

    const result = await readDevelopmentTreeSnapshot({
      workspaceRoot: tmpDir,
      workspaceSlug: "demo",
      plannedPartIds: ["project-shell"],
      generatedPartIds: ["project-shell"],
    });

    const part = result.parts[0];
    assert.ok(part);
    assert.equal(part.clusters.length, 2);
    assert.equal(part.standaloneModules.length, 1);
    assert.equal(part.standaloneModules[0]?.id, "cef-launcher");

    const standaloneIds = part.standaloneModules.map((m) => m.id);
    for (const leakedId of [
      "sidebar-module",
      "artifact-view",
      "provider-picker",
      "turn-composer",
    ]) {
      assert.ok(
        !standaloneIds.includes(leakedId),
        `Cluster module \`${leakedId}\` leaked into standalone modules`
      );
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
