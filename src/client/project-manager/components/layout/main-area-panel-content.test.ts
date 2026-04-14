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
