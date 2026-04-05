import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const MAIN_AREA_UTILS_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/main-area-utils.ts"
);
const MAIN_AREA_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/main-area.tsx"
);
const TOOLBAR_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/toolbar.tsx"
);
const WORKSPACE_TREE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree.tsx"
);

test("workflow navigation sync keeps stage routing consistent across toolbar and tree", async () => {
  const [mainAreaUtilsSource, mainAreaSource, toolbarSource, workspaceTreeSource] =
    await Promise.all([
      readFile(MAIN_AREA_UTILS_PATH, "utf8"),
      readFile(MAIN_AREA_PATH, "utf8"),
      readFile(TOOLBAR_PATH, "utf8"),
      readFile(WORKSPACE_TREE_PATH, "utf8"),
    ]);

  assert.equal(
    mainAreaUtilsSource.includes("const resolveStageByTool"),
    true,
    "main-area-utils must keep an explicit stage resolver for toolbar tool mapping"
  );
  assert.equal(
    mainAreaUtilsSource.includes('detail: { stage, source: "toolbar" }'),
    true,
    "toolbar stage activation event must include stage source metadata"
  );
  assert.equal(
    mainAreaUtilsSource.includes("skipSession"),
    false,
    "stage activation route must not keep stage-specific skipSession exceptions"
  );
  assert.equal(
    mainAreaSource.includes('window.addEventListener("pm:stage:activated", onStageActivated);'),
    true,
    "main area must react to stage activation events from tree/auto-select routes"
  );
  assert.equal(
    workspaceTreeSource.includes('new CustomEvent("pm:stage:activated"'),
    true,
    "workspace tree must route stage selection through shared stage activation event"
  );
  assert.equal(
    workspaceTreeSource.includes("onSelect: () => dispatchStageActivated(stage),"),
    true,
    "workflow stage nodes must use unified stage dispatch route"
  );
  assert.equal(
    toolbarSource.includes(
      '"pm.workflow.stage.application_foundation_envelope.label"'
    ),
    true,
    "toolbar must localize the application foundation envelope stage label"
  );
});
