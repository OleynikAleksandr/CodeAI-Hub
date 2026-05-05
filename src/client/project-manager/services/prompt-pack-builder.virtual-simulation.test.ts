import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkflowPromptPack } from "./prompt-pack-builder";

test("virtual simulation prompt pack separates chat and artifact languages", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "ru",
    chatLanguage: "uk",
    stage: "virtual_simulation",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath: ".codeai-hub/demo-workspace/description/Final_Description.md",
    templatePath: "/tmp/should-not-appear.md",
  });

  assert.equal(
    pack.content.startsWith("Workflow runtime language contract:"),
    true
  );
  assert.equal(
    pack.content.includes(
      "Chat language code: `uk` (from Settings > General > Reasoning)."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Artifact prose language code: `ru` (from Settings > General > Artifacts for the User)."
    ),
    true
  );
  assert.equal(
    pack.content.includes("Build the artifact from `Final_Description.md`."),
    true
  );
  assert.equal(
    pack.content.includes(
      "Final language reminder: user-facing chat stays in `uk`; artifact prose stays in `ru`; English examples/templates are format-only."
    ),
    true
  );
  assert.equal(pack.content.includes("Template (absolute)"), false);
});

test("description prompt pack keeps template hint", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "uk",
    stage: "description",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath: ".codeai-hub/demo-workspace/description/questionnaire.md",
    templatePath: "/tmp/description-template.md",
  });

  assert.equal(
    pack.content.includes("Template (absolute): `/tmp/description-template.md`"),
    true
  );
  assert.equal(
    pack.content.includes(
      "Artifact prose language code: `uk` (from Settings > General > Artifacts for the User)."
    ),
    true
  );
});

test("diagram modules prompt pack targets product part index and omits generic template hint", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "de",
    chatLanguage: "it",
    stage: "diagram_modules",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath:
      ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
    templatePath: "/tmp/diagram-modules-prompt.md",
  });

  assert.equal(
    pack.content.includes(
      "Build the staged artifact from `Final_Description.md` and `virtual-simulation.md`."
    ),
    true
  );
  assert.equal(
    pack.content.includes("Build the artifact from the questionnaire and template."),
    false
  );
  assert.equal(
    pack.content.includes(
      "Target path (relative): `codeai-hub/demo-workspace/diagram_modules/product-parts.index.md`"
    ),
    false
  );
  assert.equal(
    pack.content.includes(
      "Target path (relative): `.codeai-hub/demo-workspace/diagram_modules/product-parts.index.md`"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Final_Description.md (relative): `.codeai-hub/demo-workspace/description/Final_Description.md`"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "virtual-simulation.md (relative): `.codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md`"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Chat language code: `it` (from Settings > General > Reasoning)."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Artifact prose language code: `de` (from Settings > General > Artifacts for the User)."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Keep Product Part / Cluster / Module names and titles, contract-bound DSL markers, headers, field names, ids, and staged status tokens in canonical English form."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Localize only descriptive prose such as Purpose, Responsibility, notes, assumptions / open questions, and user-facing artifact notes."
    ),
    true
  );
  assert.equal(pack.content.includes("Work phases:"), true);
  assert.equal(
    pack.content.includes(
      "Phase 2: if the runtime launches a continuation subturn"
    ),
    true
  );
  assert.equal(pack.content.includes("Template (absolute)"), false);
  assert.equal(
    pack.content.includes(
      "do not spend the current turn searching for staged examples"
    ),
    true
  );
  assert.equal(pack.content.includes("module-map.md"), false);
  assert.equal(
    pack.content.includes("Output file name: `product-parts.index.md`"),
    true
  );
});
