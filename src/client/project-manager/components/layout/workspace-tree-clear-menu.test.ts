import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { buildDevelopmentTreeNodes } from "./workspace-tree-diagram-branch-nodes";

const HOOK_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx"
);
const TREE_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree.tsx"
);
const CLIENT_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/services/workflow-step-clear-client.ts"
);

test("workspace tree clear menu requires destructive confirmation and calls Core endpoint", async () => {
  const hookSource = await readFile(HOOK_SOURCE_PATH, "utf8");
  const treeSource = await readFile(TREE_SOURCE_PATH, "utf8");
  const clientSource = await readFile(CLIENT_SOURCE_PATH, "utf8");

  assert.doesNotMatch(hookSource, /window\.confirm/u);
  assert.match(hookSource, /mode: "confirm"/u);
  assert.match(hookSource, />\s*Cancel\s*</u);
  assert.match(hookSource, />\s*Clear\s*</u);
  assert.match(hookSource, /Core will use Git rollback/u);
  assert.match(hookSource, /git clean -fd/u);
  assert.match(hookSource, /onContextMenu/u);
  assert.match(hookSource, /onContextMenuCapture/u);
  assert.match(hookSource, /event\.button === 2/u);
  assert.match(hookSource, /event\.button === 2[\s\S]*openMenu/u);
  assert.match(hookSource, /const activeMenu = menu[\s\S]*close\(\)[\s\S]*const result = await clearWorkflowStep/u);
  assert.match(hookSource, /target: activeMenu\.target/u);
  assert.match(hookSource, /const result = await clearWorkflowStep/u);
  assert.match(hookSource, /restore: result\.restore/u);
  assert.match(hookSource, /deletedSessionIds: result\.deletedSessionIds/u);
  assert.match(hookSource, /pm:workflow-step:cleared/u);
  assert.match(hookSource, /pm:workflow-step:clear-failed/u);
  assert.match(clientSource, /workflow-step-clear/u);
  assert.match(clientSource, /WorkflowStepClearResult/u);
  assert.match(clientSource, /invalid Core response/u);
});

test("artifact availability probes immediately after workflow clear", async () => {
  const sourcePath = path.resolve(
    process.cwd(),
    "src/client/project-manager/components/layout/use-artifact-availability.ts"
  );
  const source = await readFile(sourcePath, "utf8");

  assert.match(source, /pm:workflow-step:cleared/u);
  assert.match(source, /handleWorkflowStepCleared/u);
  assert.match(source, /requestImmediateProbe\(\)/u);
});

test("development tree nodes carry Core clear targets", () => {
  const nodes = buildDevelopmentTreeNodes(
    {
      parts: [
        {
          id: "core",
          status: "materialized",
          workflowPath: "development_tree/materialized/product-parts/core",
          clusters: [
            {
              id: "api",
              workflowPath:
                "development_tree/materialized/product-parts/core/clusters/api",
              modules: [
                {
                  id: "auth",
                  title: "Auth",
                  workflowPath:
                    "development_tree/materialized/product-parts/core/clusters/api/modules/auth",
                  codeWorkspacePath:
                    "product-parts/core/clusters/api/modules/auth",
                },
              ],
            },
          ],
          standaloneModules: [],
        },
      ],
    },
    0
  );

  const part = nodes[0];
  const cluster = part?.children?.[0];
  const mod = cluster?.children?.[0];
  assert.deepEqual(part?.clearTarget, {
    kind: "development_tree_node",
    workflowPath: "development_tree/materialized/product-parts/core",
  });
  assert.deepEqual(cluster?.clearTarget, {
    kind: "development_tree_node",
    workflowPath: "development_tree/materialized/product-parts/core/clusters/api",
  });
  assert.deepEqual(mod?.clearTarget, {
    codeWorkspacePath: "product-parts/core/clusters/api/modules/auth",
    kind: "development_tree_node",
    workflowPath:
      "development_tree/materialized/product-parts/core/clusters/api/modules/auth",
  });
});
