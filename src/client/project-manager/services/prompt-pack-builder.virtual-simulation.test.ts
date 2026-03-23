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

test("description prompt pack keeps template hint", () => {
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

test("diagram modules prompt pack targets product part index and omits generic template hint", () => {
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
      "Собери staged артефакт на основе `Final_Description.md` и `virtual-simulation.md`."
    ),
    true
  );
  assert.equal(
    pack.content.includes("Собери артефакт на основе анкеты и шаблона."),
    false
  );
  assert.equal(
    pack.content.includes(
      "Целевой путь (relative): `codeai-hub/demo-workspace/diagram_modules/product-parts.index.md`"
    ),
    false
  );
  assert.equal(
    pack.content.includes(
      "Целевой путь (relative): `.codeai-hub/demo-workspace/diagram_modules/product-parts.index.md`"
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
  assert.equal(
    pack.content.includes(
      "Phase 2: если runtime запускает continuation subturn"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Compatibility aggregate (runtime-owned, not a default input): `.codeai-hub/demo-workspace/diagram_modules/module-inventory.md`"
    ),
    true
  );
  assert.equal(pack.content.includes("Шаблон (absolute)"), false);
  assert.equal(
    pack.content.includes(
      "не трать текущий turn на поиск compatibility inventory"
    ),
    true
  );
  assert.equal(pack.content.includes("module-map.md"), false);
  assert.equal(pack.content.includes("Имя выходного файла: `product-parts.index.md`"), true);
});

test("diagram facades prompt pack omits generic template hint and adds no-search rule", () => {
  const pack = buildWorkflowPromptPack({
    stage: "diagram_facades",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath: ".codeai-hub/demo-workspace/diagram_modules/module-inventory.md",
    templatePath: "/tmp/facade-map-template.md",
  });

  assert.equal(
    pack.content.includes("Собери артефакт на основе `module-inventory.md`."),
    true
  );
  assert.equal(
    pack.content.includes("Собери артефакт на основе анкеты и шаблона."),
    false
  );
  assert.equal(pack.content.includes("Шаблон (absolute)"), false);
  assert.equal(
    pack.content.includes(
      "Phase 1: прочитай `module-inventory.md`, затем создай или обнови `facade-map.md`"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "не трать текущий turn на поиск continuity files, helper artifacts, generic template files или legacy diagram directories"
    ),
    true
  );
  assert.equal(pack.content.includes("Имя выходного файла: `facade-map.md`"), true);
});
