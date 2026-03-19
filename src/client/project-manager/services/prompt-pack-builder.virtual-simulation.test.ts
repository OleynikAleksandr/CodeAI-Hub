import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkflowPromptPack } from "./prompt-pack-builder";

test("virtual simulation prompt pack omits template hint", () => {
  const pack = buildWorkflowPromptPack({
    stage: "virtual_simulation",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath: ".codeai-hub/demo-workspace/description/Final_Description.md",
    templatePath: "/tmp/should-not-appear.md",
  });

  assert.equal(
    pack.content.includes("Собери артефакт на основе `Final_Description.md`."),
    true
  );
  assert.equal(pack.content.includes("Шаблон (absolute)"), false);
});

test("non-virtual stages keep template hint", () => {
  const pack = buildWorkflowPromptPack({
    stage: "description",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath: ".codeai-hub/demo-workspace/description/questionnaire.md",
    templatePath: "/tmp/description-template.md",
  });

  assert.equal(pack.content.includes("Шаблон (absolute): `/tmp/description-template.md`"), true);
});

test("diagram modules prompt pack targets inventory and includes phased inputs", () => {
  const pack = buildWorkflowPromptPack({
    stage: "diagram_modules",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath:
      ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
    templatePath: "/tmp/module-inventory-template.md",
  });

  assert.equal(
    pack.content.includes(
      "Целевой путь (relative): `codeai-hub/demo-workspace/diagram_modules/module-inventory.md`"
    ),
    false
  );
  assert.equal(
    pack.content.includes(
      "Целевой путь (relative): `.codeai-hub/demo-workspace/diagram_modules/module-inventory.md`"
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
  assert.equal(pack.content.includes("Фазы работы:"), true);
  assert.equal(pack.content.includes("Phase 2: начни короткий диалог с пользователем"), true);
  assert.equal(
    pack.content.includes(
      "Phase 3: заверши шаг согласованным `module-inventory.md`"
    ),
    true
  );
  assert.equal(pack.content.includes("Derived module map"), false);
  assert.equal(pack.content.includes("module-map.md"), false);
  assert.equal(pack.content.includes("Имя выходного файла: `module-inventory.md`"), true);
});
