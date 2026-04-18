import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.ts"
);
const ARTIFACT_AVAILABILITY_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-artifact-availability.ts"
);
const DIAGRAM_STAGE_PANEL_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx"
);

test("diagram modules source availability follows product-parts.index.md", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("diagram_modules/product-parts.index.md"), true);
  assert.equal(source.includes("diagram_modules/module-inventory.md"), false);
});

test("artifact and diagram polling sources are visibility-aware", async () => {
  const [artifactAvailabilitySource, diagramStagePanelSource] = await Promise.all([
    readFile(ARTIFACT_AVAILABILITY_SOURCE_PATH, "utf8"),
    readFile(DIAGRAM_STAGE_PANEL_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    artifactAvailabilitySource.includes("const FOREGROUND_POLL_MS = 10_000;"),
    true
  );
  assert.equal(
    artifactAvailabilitySource.includes("const BACKGROUND_POLL_MS = 30_000;"),
    true
  );
  assert.equal(
    artifactAvailabilitySource.includes('document.visibilityState !== "visible"'),
    true
  );
  assert.equal(
    diagramStagePanelSource.includes("const FOREGROUND_PROGRESS_POLL_MS = 3_000;"),
    true
  );
  assert.equal(
    diagramStagePanelSource.includes("const BACKGROUND_PROGRESS_POLL_MS = 30_000;"),
    true
  );
  assert.equal(
    diagramStagePanelSource.includes('document.visibilityState !== "visible"'),
    true
  );
});
