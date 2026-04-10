import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readDevelopmentTreeSnapshot } from "./development-tree-snapshot";

const PART_CONTENT = `# Product Part: UI Shell

## Identity

| Field | Value |
|-------|-------|
| Part ID | \`ui-shell\` |
| Purpose | Primary user interface shell |

## Owned Clusters

### Cluster: \`layout-cluster\`

**Purpose:** Layout management

| \`main-area\` | \`Main Area\` | Core layout surface |
| \`sidebar\` | \`Sidebar\` | Navigation surface |

## Direct Standalone Modules Under This Part

| \`theme-engine\` | \`Theme Engine\` | Theming |
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

// Real-world DSL uses `| module-id | kind | Responsibility |` columns.
// The parser must derive the display title from the kebab-case ID when
// the second column is a single-word kind token (service, adapter, etc.).
const KIND_COLUMN_PART_CONTENT = `# Product Part: VS Code Extension

## Identity

| Field | Value |
|-------|-------|
| Part ID | \`vs-code-extension\` |
| Purpose | Shell entry point |

## Standalone Modules

| \`module-id\` | \`kind\` | Responsibility |
| --- | --- | --- |
| \`extension-entry-shell\` | \`service\` | Entry commands |
| \`runtime-handshake-adapter\` | \`adapter\` | Runtime connection |
`;

test("readDevelopmentTreeSnapshot humanizes module IDs when column 2 is a kind token", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "devtree-kind-"));
  try {
    const partDir = path.join(
      tmpDir,
      ".codeai-hub/demo/diagram_modules/product-parts"
    );
    await mkdir(partDir, { recursive: true });
    await writeFile(
      path.join(partDir, "vs-code-extension.md"),
      KIND_COLUMN_PART_CONTENT,
      "utf8"
    );

    const result = await readDevelopmentTreeSnapshot({
      workspaceRoot: tmpDir,
      workspaceSlug: "demo",
      plannedPartIds: ["vs-code-extension"],
      generatedPartIds: ["vs-code-extension"],
    });

    assert.equal(result.parts.length, 1);
    const part = result.parts[0];
    assert.ok(part);
    assert.equal(part.standaloneModules.length, 2);
    assert.equal(
      part.standaloneModules[0]?.title,
      "Extension Entry Shell",
      "single-word kind column must trigger ID humanization"
    );
    assert.equal(part.standaloneModules[1]?.title, "Runtime Handshake Adapter");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("readDevelopmentTreeSnapshot extracts clusters and modules from materialized parts", async () => {
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
    assert.equal(part.standaloneModules.length, 1);
    assert.equal(part.standaloneModules[0]?.id, "theme-engine");
    assert.equal(part.standaloneModules[0]?.title, "Theme Engine");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
