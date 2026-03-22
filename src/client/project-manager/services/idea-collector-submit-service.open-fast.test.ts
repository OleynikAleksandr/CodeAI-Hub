import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SERVICE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/services/description-submit-service.ts"
);

const PANEL_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/description/description-questionnaire-panel.tsx"
);

test("questionnaire submit opens session immediately after session:created", async () => {
  const source = await readFile(SERVICE_PATH, "utf8");

  assert.equal(source.includes("const contractPromise = loadWorkflowContract(stage);"), true);
  assert.equal(source.includes("params.onSessionCreated?.(session.id);"), true);

  const callbackIndex = source.indexOf("params.onSessionCreated?.(session.id);");
  const contractAwaitIndex = source.indexOf("await contractPromise;");

  assert.equal(callbackIndex >= 0, true, "expected onSessionCreated callback");
  assert.equal(contractAwaitIndex >= 0, true, "expected contractPromise await");
  assert.equal(
    callbackIndex < contractAwaitIndex,
    true,
    "session should be opened before awaiting workflow contract"
  );

  const panelSource = await readFile(PANEL_PATH, "utf8");
  assert.equal(
    panelSource.includes("onSessionCreated: onDescriptionSessionCreated,"),
    true
  );
});
