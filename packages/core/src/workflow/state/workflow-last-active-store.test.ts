import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  resolvePreferredWorkflowLastActive,
  WorkflowLastActiveStore,
} from "./workflow-last-active-store";

test("WorkflowLastActiveStore restores diagram modules as the last active stage", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "diagram-modules-last-active-")
  );
  const store = new WorkflowLastActiveStore({
    clock: () => "2026-04-05T12:55:00.000Z",
  });

  await store.upsert(workspaceRoot, "demo-workspace", {
    stage: "diagram_modules",
    artifactPath:
      ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md",
  });

  const restored = await new WorkflowLastActiveStore().read(
    workspaceRoot,
    "demo-workspace"
  );

  assert.ok(restored);
  assert.equal(restored.stage, "diagram_modules");
  assert.equal(
    restored.artifactPath,
    ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md"
  );
  assert.equal(restored.updatedAt, "2026-04-05T12:55:00.000Z");
});

test("WorkflowLastActiveStore replaces malformed state with valid JSON", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "workflow-last-active-repair-")
  );
  const workspaceSlug = "demo-workspace";
  const statePath = path.join(
    workspaceRoot,
    ".codeai-hub",
    workspaceSlug,
    "workflow",
    "state.json"
  );
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(
    statePath,
    [
      "{",
      '  "workspaceSlug": "demo-workspace",',
      '  "updatedAt": "2026-04-05T12:00:00.000Z"',
      "}",
      "}",
      "",
    ].join("\n"),
    "utf8"
  );

  await new WorkflowLastActiveStore({
    clock: () => "2026-04-05T12:55:00.000Z",
  }).upsert(workspaceRoot, workspaceSlug, {
    stage: "application_skeleton",
    artifactPath:
      ".codeai-hub/demo-workspace/application_skeleton/application-skeleton.md",
  });

  const repaired = JSON.parse(await readFile(statePath, "utf8")) as {
    readonly lastActive: { readonly stage: string };
  };

  assert.equal(repaired.lastActive.stage, "application_skeleton");
});

test("resolvePreferredWorkflowLastActive prefers the latest trunk stage when timestamps tie", () => {
  const preferred = resolvePreferredWorkflowLastActive([
    {
      stage: "description",
      updatedAt: "2026-04-06T08:00:00.000Z",
      artifactPath:
        ".codeai-hub/demo-workspace/description/Final_Description.md",
    },
    {
      stage: "virtual_simulation",
      updatedAt: "2026-04-06T08:00:00.000Z",
      artifactPath:
        ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
    },
    {
      stage: "diagram_modules",
      updatedAt: "2026-04-06T08:00:00.000Z",
      artifactPath:
        ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md",
    },
  ]);

  assert.ok(preferred);
  assert.equal(preferred.stage, "diagram_modules");
  assert.equal(
    preferred.artifactPath,
    ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md"
  );
});
