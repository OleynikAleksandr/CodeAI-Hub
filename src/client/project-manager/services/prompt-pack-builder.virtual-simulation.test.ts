import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkflowPromptPack } from "./prompt-pack-builder";

test("virtual simulation prompt pack omits template hint", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "ru",
    stage: "virtual_simulation",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath: ".codeai-hub/demo-workspace/description/Final_Description.md",
    templatePath: "/tmp/should-not-appear.md",
  });

  assert.equal(
    pack.content.includes("Build the artifact from `Final_Description.md`."),
    true
  );
  assert.equal(
    pack.content.includes("Artifacts for the User language (runtime directive):"),
    true
  );
  assert.equal(pack.content.includes("Target language code: `ru`."), true);
  assert.equal(
    pack.content.includes(
      "Write the final user-facing artifact and brief user-facing chat updates in `ru`."
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
  assert.equal(pack.content.includes("Target language code: `uk`."), true);
});

test("diagram modules prompt pack targets product part index and omits generic template hint", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "de",
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
  assert.equal(pack.content.includes("Target language code: `de`."), true);
  assert.equal(
    pack.content.includes(
      "Keep Product Part / Cluster / Module names and titles, contract-bound DSL markers, headers, field names, ids, and staged status tokens in canonical English form."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Localize only descriptive prose such as Purpose, Responsibility, notes, assumptions / open questions, and brief user-facing chat updates."
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

test("application foundation envelope prompt pack targets the canonical markdown artifact", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "fr",
    stage: "application_foundation_envelope",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath:
      ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md",
    templatePath: "/tmp/application-foundation-envelope-prompt.md",
  });

  assert.equal(
    pack.content.includes(
      "Build the artifact from `Final_Description.md`, `virtual-simulation.md`, and the staged `Diagram Modules` artifacts."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Target path (relative): `.codeai-hub/demo-workspace/application_foundation_envelope/application-foundation-envelope.md`"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "product-parts.index.md (relative): `.codeai-hub/demo-workspace/diagram_modules/product-parts.index.md`"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Product Part files (pattern): `.codeai-hub/demo-workspace/diagram_modules/product-parts/<part-id>.md`"
    ),
    true
  );
  assert.equal(pack.content.includes("Target language code: `fr`."), true);
  assert.equal(pack.content.includes("Template (absolute)"), false);
  assert.equal(
    pack.content.includes("Output file name: `application-foundation-envelope.md`"),
    true
  );
});
