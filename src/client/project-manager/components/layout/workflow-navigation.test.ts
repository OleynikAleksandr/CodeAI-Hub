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
const WORKSPACE_TREE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree.tsx"
);
const WORKSPACE_TREE_AUTO_SELECT_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree-auto-select.ts"
);
const MAIN_AREA_WORKFLOW_STATE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-main-area-workflow-state.ts"
);

test("sidebar-only workflow navigation keeps stage routing consistent", async () => {
  const [
    mainAreaUtilsSource,
    mainAreaSource,
    workspaceTreeSource,
    workspaceTreeAutoSelectSource,
    mainAreaWorkflowStateSource,
  ] = await Promise.all([
      readFile(MAIN_AREA_UTILS_PATH, "utf8"),
      readFile(MAIN_AREA_PATH, "utf8"),
      readFile(WORKSPACE_TREE_PATH, "utf8"),
      readFile(WORKSPACE_TREE_AUTO_SELECT_PATH, "utf8"),
      readFile(MAIN_AREA_WORKFLOW_STATE_PATH, "utf8"),
    ]);

  // main-area-utils still maps stage IDs to tool labels for panel routing
  assert.equal(
    mainAreaUtilsSource.includes("STAGE_TO_TOOL_MAP"),
    true,
    "main-area-utils must keep stage-to-tool mapping for panel routing"
  );
  assert.equal(
    mainAreaUtilsSource.includes("skipSession"),
    false,
    "stage activation route must not keep stage-specific skipSession exceptions"
  );

  // main area reacts to sidebar stage events
  assert.equal(
    mainAreaSource.includes('window.addEventListener("pm:stage:activated", onStageActivated);'),
    true,
    "main area must react to stage activation events from sidebar tree"
  );

  // main area must not render a toolbar or import it
  assert.equal(
    mainAreaSource.includes("<Toolbar"),
    false,
    "main area must not render a top stage toolbar — sidebar is the only navigation surface"
  );
  assert.equal(
    mainAreaSource.includes('from "./toolbar"'),
    false,
    "main area must not import toolbar component"
  );

  // main area must not eagerly set activeTool to Description on workspace change
  assert.equal(
    mainAreaSource.includes('setActiveTool("Description")'),
    false,
    "main area must not bypass sidebar by eagerly setting Description tool on workspace change"
  );

  // workspace tree dispatches stage activation events
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
    workspaceTreeSource.includes("useWorkspaceTreeActiveStage"),
    true,
    "workspace tree must subscribe to the shared active-stage route"
  );
  assert.equal(
    workspaceTreeSource.includes("isSelected: stage === activeStage"),
    true,
    "workspace tree stage selection must derive from activeStage"
  );
  assert.equal(
    workspaceTreeSource.includes("pm-tree__item--selected"),
    true,
    "workspace tree must render a dedicated selected-stage modifier"
  );
  assert.equal(
    workspaceTreeAutoSelectSource.includes('const STARTUP_STAGE = "description";'),
    true,
    "workspace startup auto-select must force the description stage"
  );
  assert.equal(
    workspaceTreeAutoSelectSource.includes('state.lastActive?.stage ?? "description"'),
    false,
    "workspace startup auto-select must not derive stage from lastActive"
  );
  assert.equal(
    mainAreaWorkflowStateSource.includes("const resolveStartupTool"),
    true,
    "main area startup bootstrap must keep a dedicated description-first tool resolver"
  );
  assert.equal(
    mainAreaWorkflowStateSource.includes("nextHasDescriptionSession && !nextDescription"),
    false,
    "description startup must keep questionnaire routing independent from runtime session presence"
  );
});
