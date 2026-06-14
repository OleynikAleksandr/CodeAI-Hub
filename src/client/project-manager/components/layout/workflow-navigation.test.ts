import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { resolveActiveUserGateSessionIntent } from "./workspace-tree-user-gate-focus";

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
const WORKSPACE_TREE_USER_GATE_FOCUS_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree-user-gate-focus.ts"
);
const WORKSPACE_TREE_SELECTION_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree-selection.ts"
);
const MAIN_AREA_WORKFLOW_STATE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-main-area-workflow-state.ts"
);
const WORKFLOW_STATE_REFRESH_EVENTS_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workflow-state-refresh-events.ts"
);
const STAGE_PANEL_SYNC_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-stage-panel-sync.ts"
);
const PROJECT_MANAGER_STYLES_PATH = path.resolve(
  process.cwd(),
  "packages/ui/project-manager/styles.css"
);

test("user gate focus resolves active development tree session intent", () => {
  assert.deepEqual(
    resolveActiveUserGateSessionIntent(
      {
        activeUserGate: {
          nodeId: "product-part:finder-widget-shell",
          session: {
            providerId: "codexCli",
            providerSessionId: "provider-session-1",
          },
          workflowPath:
            "development-tree.product-part.finder-widget-shell.phase2.brief-review.task1",
        },
      },
      "/tmp/FinderWidget-Test01",
      "finderwidget-test01"
    ),
    {
      providerId: "codexCli",
      providerSessionId: "provider-session-1",
      workspacePath: "/tmp/FinderWidget-Test01",
      workspaceSlug: "finderwidget-test01",
      initiativeSlug: "finderwidget-test01",
      stage:
        "development-tree.product-part.finder-widget-shell.phase2.brief-review.task1",
      sessionKind: "collector",
      runSlug: null,
    }
  );
});

test("sidebar-only workflow navigation keeps stage routing consistent", async () => {
  const [
    mainAreaUtilsSource,
    mainAreaSource,
    workspaceTreeSource,
    workspaceTreeAutoSelectSource,
    workspaceTreeUserGateFocusSource,
    workspaceTreeSelectionSource,
    mainAreaWorkflowStateSource,
    workflowStateRefreshEventsSource,
    stagePanelSyncSource,
    projectManagerStylesSource,
  ] = await Promise.all([
      readFile(MAIN_AREA_UTILS_PATH, "utf8"),
      readFile(MAIN_AREA_PATH, "utf8"),
      readFile(WORKSPACE_TREE_PATH, "utf8"),
      readFile(WORKSPACE_TREE_AUTO_SELECT_PATH, "utf8"),
      readFile(WORKSPACE_TREE_USER_GATE_FOCUS_PATH, "utf8"),
      readFile(WORKSPACE_TREE_SELECTION_PATH, "utf8"),
      readFile(MAIN_AREA_WORKFLOW_STATE_PATH, "utf8"),
      readFile(WORKFLOW_STATE_REFRESH_EVENTS_PATH, "utf8"),
      readFile(STAGE_PANEL_SYNC_PATH, "utf8"),
      readFile(PROJECT_MANAGER_STYLES_PATH, "utf8"),
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
  assert.equal(
    mainAreaSource.includes('"workflow:stage:activate"'),
    true,
    "main area must listen for Core-managed stage activation events"
  );
  assert.equal(
    mainAreaSource.includes("core-workflow-stage-activate"),
    true,
    "Core stage activation must reuse the shared stage activation route"
  );
  assert.equal(
    stagePanelSyncSource.includes("pendingCoreActivation"),
    true,
    "Core stage activation must be retained until workflow snapshot refresh catches up"
  );
  assert.equal(
    stagePanelSyncSource.includes(
      'detail?.source === "core-workflow-stage-activate"'
    ),
    true,
    "stage panel sync must recognize Core-owned stage activation events"
  );
  assert.equal(
    stagePanelSyncSource.includes("workflowState?.updatedAt"),
    true,
    "stage activation replay must compare against the snapshot version seen at event time"
  );
  assert.equal(
    stagePanelSyncSource.includes("syncPanelsToStage(pendingCoreActivation.stage)"),
    true,
    "Core stage activation must be replayed after a fresh workflow snapshot"
  );
  assert.equal(
    stagePanelSyncSource.includes("lastWorkflowStateActivationKeyRef"),
    true,
    "workflow snapshot lastActive stage handoff must dedupe applied stages"
  );
  assert.equal(
    stagePanelSyncSource.includes('"workflow-state-last-active"'),
    true,
    "workflow snapshot lastActive must reuse the shared stage activation route"
  );
  assert.equal(
    stagePanelSyncSource.includes("workflowState?.lastActive"),
    true,
    "stage panel sync must recover stage handoff from persisted workflow lastActive state"
  );
  assert.equal(
    workflowStateRefreshEventsSource.includes("managed-workflow-user-review"),
    true,
    "managed workflow user review messages must trigger immediate workflow-state refresh"
  );
  assert.equal(
    workflowStateRefreshEventsSource.includes("managed-workflow-complete"),
    true,
    "managed workflow completion messages must trigger immediate workflow-state refresh"
  );
  assert.equal(
    mainAreaSource.includes("shouldRefreshWorkflowStateForCoreEvent"),
    true,
    "main area must centralize workflow-state refresh event detection"
  );
  assert.equal(
    workflowStateRefreshEventsSource.includes('message.payload.role === "user"'),
    true,
    "user review actions must trigger immediate workflow-state refresh without waiting for polling"
  );
  assert.equal(
    mainAreaSource.includes("workflowStateStore.requestImmediatePoll()"),
    true,
    "main area must refresh workflow state immediately for Core-managed review lifecycle events"
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
    workspaceTreeSource.includes("useWorkspaceTreeSelectionCursor"),
    true,
    "workspace tree must use a single selected node cursor for both trees"
  );
  assert.equal(
    workspaceTreeSource.includes("node.id === selectedNodeId"),
    true,
    "workspace tree selected marker must compare every rendered node against the shared cursor"
  );
  assert.equal(
    workspaceTreeSelectionSource.includes('window.addEventListener("pm:branch:selected", onBranch);'),
    true,
    "development tree branch selection must move the shared selected cursor"
  );
  assert.equal(
    workspaceTreeSelectionSource.includes("selectedTreeNodeId ??"),
    true,
    "workflow active stage must be only the fallback selected cursor"
  );
  assert.equal(
    workspaceTreeSource.includes("isSelected: stage === activeStage"),
    false,
    "workspace tree must not keep Documentation Tree selected after selecting a Development Tree node"
  );
  assert.equal(
    workspaceTreeSource.includes("pm-tree__item--selected"),
    true,
    "workspace tree must render a dedicated selected-stage modifier"
  );
  assert.equal(
    workspaceTreeSource.includes("useWorkspaceTreeUserGateFocus"),
    true,
    "workspace tree must auto-select the active Core-owned user gate node"
  );
  assert.equal(
    workspaceTreeSource.includes("resolveInitialDevelopmentTreeExpansion"),
    false,
    "development tree must not auto-expand the first Product Part on hydration"
  );
  assert.equal(
    workspaceTreeUserGateFocusSource.includes("CLUSTER_USER_GATE_NODE_ID_RE"),
    true,
    "workspace tree user gate focus helper must normalize cluster user gate node ids"
  );
  assert.equal(
    workspaceTreeUserGateFocusSource.includes("`devtree:${clusterMatch[1]}:${clusterMatch[2]}`"),
    true,
    "cluster user gate ids must resolve to development tree cluster node ids"
  );
  assert.equal(
    workspaceTreeUserGateFocusSource.includes("activeNode.onSelect();"),
    true,
    "active user gate focus must reuse the node's existing selection route"
  );
  assert.equal(
    workspaceTreeSource.includes("userGateTargets"),
    true,
    "workspace tree must pass a stable gate identity key for repeated gates on the same node"
  );
  assert.equal(
    workspaceTreeUserGateFocusSource.includes(
      "dispatchDialogOpenIntent(activeGateSessionIntent)"
    ),
    true,
    "active user gate focus must open the Core-provided active gate session"
  );
  assert.equal(
    workspaceTreeUserGateFocusSource.includes("lastFocusedGateKeyRef"),
    true,
    "active user gate focus must dedupe by gate identity, not just by node id"
  );
  assert.equal(
    workspaceTreeSource.includes("renderTypeMarkerControl"),
    true,
    "development tree type markers must have a dedicated toggle control"
  );
  assert.equal(
    workspaceTreeSource.includes("event.stopPropagation();"),
    true,
    "type marker toggles must not bubble into row selection"
  );
  assert.equal(
    workspaceTreeSource.includes("if (node.isCollapsible) togglePart"),
    false,
    "Product Part row selection must not toggle expansion"
  );
  assert.equal(
    workspaceTreeSource.includes("if (node.isCollapsible) toggleCluster"),
    false,
    "Cluster row selection must not toggle expansion"
  );
  assert.equal(
    projectManagerStylesSource.includes(".pm-tree__type-toggle"),
    true,
    "Project Manager styles must reset the P/C/M marker toggle button"
  );
  assert.equal(
    workspaceTreeAutoSelectSource.includes("resolveLastActiveStage"),
    true,
    "workspace startup auto-select must resolve the last active stage dynamically"
  );
  assert.equal(
    workspaceTreeAutoSelectSource.includes('const FALLBACK_STAGE'),
    true,
    "workspace startup auto-select must define a fallback stage"
  );
  assert.equal(
    mainAreaWorkflowStateSource.includes("const resolveStartupTool"),
    true,
    "main area startup bootstrap must keep a dedicated startup tool resolver"
  );
  assert.equal(
    mainAreaWorkflowStateSource.includes("nextHasDescriptionSession && !nextDescription"),
    false,
    "description startup must keep questionnaire routing independent from runtime session presence"
  );
});
