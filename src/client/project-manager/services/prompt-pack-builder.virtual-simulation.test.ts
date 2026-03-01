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
