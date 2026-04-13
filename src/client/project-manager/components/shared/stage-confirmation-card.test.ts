import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/shared/stage-confirmation-card.tsx"
);

test("stage confirmation card keeps explicit provider override in start path", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("const [selectedProviderId, setSelectedProviderId] ="), true);
  assert.equal(source.includes("resolvePreferredWorkflowProviderId({"), true);
  assert.equal(source.includes("providerId: selectedProviderId,"), true);
  assert.equal(source.includes("startService.startVirtualSimulation({"), true);
  assert.equal(source.includes("startService.startDiagramModules({"), true);
});

test("stage confirmation card keeps previous-step badge and override helper copy", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('"pm.confirmation_card.previous_provider_badge"'),
    true
  );
  assert.equal(
    source.includes('"pm.confirmation_card.selected_provider_hint"'),
    true
  );
  assert.equal(
    source.includes('"pm.confirmation_card.selected_provider_override_hint"'),
    true
  );
  assert.equal(source.includes("isUsingInheritedProvider"), true);
});
