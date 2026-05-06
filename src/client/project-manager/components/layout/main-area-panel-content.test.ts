import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/main-area-panel-content.tsx"
);

test("main-area panel content keeps hook declarations ahead of localization busy returns", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  const artifactBusyIndex = source.indexOf(
    "if (localizationSyncStatus.busy) {\n    return renderLocalizationSyncBlockedState(localizationSyncStatus.message);\n  }\n\n  if (selectedBranchNode)"
  );
  const artifactHelperHookIndex = source.indexOf(
    "const descriptionArtifactAvailable = useDescriptionArtifactAvailability({"
  );
  const artifactDiagramHookIndex = source.indexOf(
    "const diagramModulesSourceAvailable = useDiagramModulesArtifactAvailability({"
  );
  assert.equal(artifactHelperHookIndex >= 0, true);
  assert.equal(artifactDiagramHookIndex >= 0, true);
  assert.equal(artifactBusyIndex > artifactHelperHookIndex, true);
  assert.equal(artifactBusyIndex > artifactDiagramHookIndex, true);

  const sessionBusyIndex = source.indexOf(
    "if (localizationSyncStatus.busy) {\n    return renderLocalizationSyncBlockedState(localizationSyncStatus.message);\n  }\n\n  if (showDescriptionHelp)"
  );
  const sessionIntentRefIndex = source.indexOf(
    "const intentRef = useRef(nextIntent);"
  );
  const sessionInitialIntentIndex = source.indexOf(
    "const initialIntent = useMemo(() => {"
  );
  assert.equal(sessionIntentRefIndex >= 0, true);
  assert.equal(sessionInitialIntentIndex >= 0, true);
  assert.equal(sessionBusyIndex > sessionIntentRefIndex, true);
  assert.equal(sessionBusyIndex > sessionInitialIntentIndex, true);
});

test("main-area session content scopes runtime fallback by selected development-tree node path", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  const startupStageIndex = source.indexOf(
    "const sessionStartupStage = selectedBranchNode?.workflowPath ?? stageId;"
  );
  const sessionViewIndex = source.indexOf(
    "startupStage={sessionStartupStage}"
  );
  const branchIntentIndex = source.indexOf("selectedBranchNode\n      ?");
  const nullIntentIndex = source.indexOf("        : null", branchIntentIndex);
  const stageIntentIndex = source.indexOf(
    "resolveStageSessionIntent(",
    nullIntentIndex
  );
  assert.equal(startupStageIndex >= 0, true);
  assert.equal(sessionViewIndex > startupStageIndex, true);
  assert.equal(branchIntentIndex >= 0, true);
  assert.equal(nullIntentIndex > branchIntentIndex, true);
  assert.equal(stageIntentIndex > nullIntentIndex, true);
});

test("main-area session content lets selected development-tree node outrank stale step-started intent", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  const selectedNodeIntentIndex = source.indexOf(
    "const sessionInitialDialogIntent = selectedBranchNode"
  );
  const nodeWinsIndex = source.indexOf(
    "? initialIntent\n    : stepStartedIntent ?? initialIntent;",
    selectedNodeIntentIndex
  );
  const propIndex = source.indexOf(
    "initialDialogIntent={sessionInitialDialogIntent}",
    nodeWinsIndex
  );
  const stalePropIndex = source.indexOf(
    "initialDialogIntent={stepStartedIntent ?? initialIntent}"
  );
  assert.equal(selectedNodeIntentIndex >= 0, true);
  assert.equal(nodeWinsIndex > selectedNodeIntentIndex, true);
  assert.equal(propIndex > nodeWinsIndex, true);
  assert.equal(stalePropIndex, -1);
});

test("main-area panel content routes application skeleton artifacts and help", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('from "./workflow-stage-panel-registry"'),
    true
  );
  assert.equal(source.includes("renderWorkflowStageHelp(activeTool)"), true);
  assert.equal(source.includes("renderWorkflowStagePanel({"), true);
});
