import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const PANEL_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/foundation-envelope/foundation-envelope-panel.tsx"
);
const USER_MESSAGES_DICTIONARY_PATH = path.resolve(
  process.cwd(),
  "assets/localization/source/en/messages_for_the_user.json"
);
const UI_LABELS_DICTIONARY_PATH = path.resolve(
  process.cwd(),
  "assets/localization/source/en/ui_labels.json"
);

test("foundation envelope panel reads localized help and shell copy from canonical dictionaries", async () => {
  const [panelSource, userMessagesRaw, uiLabelsRaw] = await Promise.all([
    readFile(PANEL_SOURCE_PATH, "utf8"),
    readFile(USER_MESSAGES_DICTIONARY_PATH, "utf8"),
    readFile(UI_LABELS_DICTIONARY_PATH, "utf8"),
  ]);

  const userMessages = JSON.parse(userMessagesRaw) as Record<string, string>;
  const uiLabels = JSON.parse(uiLabelsRaw) as Record<string, string>;

  assert.equal(
    panelSource.includes('"pm.foundation_envelope.help.title"'),
    true
  );
  assert.equal(
    panelSource.includes('"pm.foundation_envelope.help.output"'),
    true
  );
  assert.equal(
    panelSource.includes('"pm.workflow.stage.foundation_envelope.label"'),
    true
  );
  assert.equal(panelSource.includes("DiagramStagePanelScaffold"), true);
  assert.equal(panelSource.includes("useDiagramLoader"), true);
  assert.equal(panelSource.includes("useDiagramPersistence"), true);
  assert.equal(panelSource.includes("pendingContent={<FoundationEnvelopeHelp />}"), true);
  assert.equal(panelSource.includes("StageArtifactContentView"), false);
  assert.equal(panelSource.includes("useStageArtifactLoader"), false);

  assert.equal(
    userMessages["pm.foundation_envelope.help.title"],
    "Foundation Envelope Help"
  );
  assert.match(
    userMessages["pm.foundation_envelope.help.intro"] ?? "",
    /Application Root/
  );
  assert.match(
    userMessages["pm.foundation_envelope.help.intro"] ?? "",
    /Shared Zones/
  );
  assert.match(
    userMessages["pm.foundation_envelope.help.scope"] ?? "",
    /application-wide assembly baseline/
  );
  assert.match(
    userMessages["pm.foundation_envelope.help.output"] ?? "",
    /foundation-envelope\.flow\.json/
  );

  assert.equal(
    uiLabels["pm.workflow.stage.foundation_envelope.label"],
    "Foundation Envelope"
  );
  assert.equal(
    uiLabels["pm.workflow.stage.foundation_envelope.blocked_title"],
    "BLOCKED: requires Diagram Modules aggregate-ready output (DONE)"
  );
  assert.equal(
    uiLabels["pm.workflow.stage.foundation_envelope.session_label"],
    "{stageLabel} {providerTitle}"
  );
});
