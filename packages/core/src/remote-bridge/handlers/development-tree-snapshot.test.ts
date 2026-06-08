import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DevelopmentTreeStateFacade } from "../../development-tree/development-tree-state-facade";
import { readDevelopmentTreeSnapshot } from "./development-tree-snapshot";

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

const createReadyDraft = (title: string): string => `---
status: draft
outdated: false
orphaned: false
---
# ${title}

## Responsibility
<!-- agent-fill -->
Defined.
<!-- /agent-fill -->
`;

const writeApplicationSkeletonMap = async (workspaceRoot: string) => {
  const mapPath = path.join(
    workspaceRoot,
    ".codeai-hub/demo/application_skeleton/application-skeleton-map.json"
  );
  await mkdir(path.dirname(mapPath), { recursive: true });
  await writeFile(
    mapPath,
    `${JSON.stringify({
      accepted: true,
      materialized: true,
      productParts: [
        {
          id: "ui-shell",
          codePath: "product-parts/ui-shell",
          clusters: [
            {
              id: "layout-cluster",
              codePath: "product-parts/ui-shell/clusters/layout-cluster",
              modules: [
                {
                  id: "main-area",
                  codePath:
                    "product-parts/ui-shell/clusters/layout-cluster/modules/main-area",
                },
              ],
            },
          ],
          standaloneModules: [
            {
              id: "theme-engine",
              codePath: "product-parts/ui-shell/modules/theme-engine",
            },
          ],
        },
      ],
    })}\n`,
    "utf8"
  );
};

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

test("readDevelopmentTreeSnapshot stays compatible with DevelopmentTreeStateFacade output", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "devtree-"));
  try {
    const params = {
      workspaceRoot: tmpDir,
      workspaceSlug: "demo",
      plannedPartIds: ["ui-shell"],
      generatedPartIds: [],
    };
    const facade = new DevelopmentTreeStateFacade();
    assert.deepEqual(
      await readDevelopmentTreeSnapshot(params),
      await facade.currentSnapshot(params)
    );
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
    assert.equal(
      part.workflowPath,
      "development_tree/materialized/product-parts/ui-shell"
    );
    assert.equal(part.artifacts, undefined);
    assert.equal(part.session, undefined);
    assert.equal(part.clusters.length, 1);
    assert.equal(part.clusters[0]?.id, "layout-cluster");
    assert.equal(
      part.clusters[0]?.workflowPath,
      "development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster"
    );
    assert.equal(part.clusters[0]?.artifacts, undefined);
    assert.equal(part.clusters[0]?.session, undefined);
    assert.equal(part.clusters[0]?.modules.length, 2);
    assert.equal(part.clusters[0]?.modules[0]?.id, "main-area");
    assert.equal(part.clusters[0]?.modules[0]?.title, "Main Area");
    assert.equal(
      part.clusters[0]?.modules[0]?.workflowPath,
      "development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/modules/main-area"
    );
    assert.equal(part.clusters[0]?.modules[0]?.artifacts, undefined);
    assert.equal(part.clusters[0]?.modules[0]?.session, undefined);
    assert.equal(part.clusters[0]?.modules[1]?.id, "sidebar");
    assert.equal(part.clusters[0]?.modules[1]?.title, "Sidebar");
    assert.equal(part.standaloneModules.length, 1);
    assert.equal(part.standaloneModules[0]?.id, "theme-engine");
    assert.equal(part.standaloneModules[0]?.title, "Theme Engine");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("readDevelopmentTreeSnapshot exposes code workspace paths only from materialized application skeleton", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "devtree-"));
  try {
    const partDir = path.join(
      tmpDir,
      ".codeai-hub/demo/diagram_modules/product-parts"
    );
    await mkdir(partDir, { recursive: true });
    await writeFile(path.join(partDir, "ui-shell.md"), PART_CONTENT, "utf8");
    await writeApplicationSkeletonMap(tmpDir);
    const statePath = path.join(
      tmpDir,
      ".codeai-hub/demo/workflow/managed/development-tree-product-parts/ui-shell.unlock-state.json"
    );
    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(
      statePath,
      [
        '{"nodes":[',
        '{"clusterId":"layout-cluster","id":"cluster:ui-shell/layout-cluster","kind":"cluster","mergeCommitHash":"merge123","partId":"ui-shell","status":"merged"},',
        '{"clusterId":"layout-cluster","id":"module:ui-shell/layout-cluster/main-area","kind":"module","moduleId":"main-area","partId":"ui-shell","reason":"waiting_for_cluster_contract","status":"locked"}',
        "]}\n",
      ].join(""),
      "utf8"
    );
    const boundaryPath = path.join(
      tmpDir,
      ".codeai-hub/demo/workflow/managed/development-tree-clusters/ui-shell/layout-cluster.merge-boundary.json"
    );
    await mkdir(path.dirname(boundaryPath), { recursive: true });
    await writeFile(
      boundaryPath,
      '{"sourceHead":"abc123","sourceWorkspaceRoot":"/tmp/layout-cluster"}\n',
      "utf8"
    );

    const result = await readDevelopmentTreeSnapshot({
      workspaceRoot: tmpDir,
      workspaceSlug: "demo",
      plannedPartIds: ["ui-shell"],
      generatedPartIds: ["ui-shell"],
    });

    const part = result.parts[0];
    assert.equal(part?.codeWorkspacePath, "product-parts/ui-shell");
    assert.equal(
      part?.clusters[0]?.codeWorkspacePath,
      "product-parts/ui-shell/clusters/layout-cluster"
    );
    assert.equal(
      part?.clusters[0]?.modules[0]?.codeWorkspacePath,
      "product-parts/ui-shell/clusters/layout-cluster/modules/main-area"
    );
    assert.equal(
      part?.standaloneModules[0]?.codeWorkspacePath,
      "product-parts/ui-shell/modules/theme-engine"
    );
    assert.equal(part?.clusters[0]?.modules[1]?.codeWorkspacePath, undefined);
    const cluster = part?.clusters[0] as
      | { readonly coordination?: Record<string, string> }
      | undefined;
    const module = part?.clusters[0]?.modules[0] as
      | { readonly coordination?: Record<string, string> }
      | undefined;
    assert.equal(cluster?.coordination?.status, "merged");
    assert.equal(cluster?.coordination?.worktreePath, "/tmp/layout-cluster");
    assert.equal(module?.coordination?.status, "locked");
    assert.equal(
      module?.coordination?.lockedReason,
      "waiting_for_cluster_contract"
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("readDevelopmentTreeSnapshot includes aggregated draft readiness", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "devtree-"));
  try {
    const partDir = path.join(
      tmpDir,
      ".codeai-hub/demo/diagram_modules/product-parts"
    );
    await mkdir(partDir, { recursive: true });
    await writeFile(path.join(partDir, "ui-shell.md"), PART_CONTENT, "utf8");

    const materializedPart = path.join(
      tmpDir,
      ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell"
    );
    await mkdir(
      path.join(materializedPart, "clusters/layout-cluster/modules/main-area"),
      { recursive: true }
    );
    await writeFile(
      path.join(materializedPart, "ProductPartDevelopmentBrief.draft.md"),
      createReadyDraft("ProductPartDevelopmentBrief"),
      "utf8"
    );
    await writeFile(
      path.join(
        materializedPart,
        "clusters/layout-cluster/ClusterDescription.draft.md"
      ),
      createReadyDraft("ClusterDescription"),
      "utf8"
    );
    await writeFile(
      path.join(
        materializedPart,
        "clusters/layout-cluster/ClusterFacadeContract.draft.md"
      ),
      createReadyDraft("ClusterFacadeContract"),
      "utf8"
    );
    await writeFile(
      path.join(
        materializedPart,
        "clusters/layout-cluster/modules/main-area/ModuleSpec.draft.md"
      ),
      createReadyDraft("ModuleSpec"),
      "utf8"
    );
    await writeFile(
      path.join(
        materializedPart,
        "clusters/layout-cluster/modules/main-area/ModuleFacadeContract.draft.md"
      ),
      createReadyDraft("ModuleFacadeContract"),
      "utf8"
    );

    const result = await readDevelopmentTreeSnapshot({
      workspaceRoot: tmpDir,
      workspaceSlug: "demo",
      plannedPartIds: ["ui-shell"],
      generatedPartIds: ["ui-shell"],
    });

    const part = result.parts[0];
    assert.ok(part);
    assert.equal(part.readiness, "in_progress");
    assert.equal(part.clusters[0]?.readiness, "in_progress");
    assert.equal(part.clusters[0]?.modules[0]?.readiness, "ready");
    assert.equal(part.clusters[0]?.modules[1]?.readiness, "idle");
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
