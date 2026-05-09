import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkflowPromptPack } from "./prompt-pack-builder";

test("Diagram Modules prompt pack embeds inline format contract snippets", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "ru",
    chatLanguage: "ru",
    prompt: "Build Diagram Modules.",
    questionnairePath:
      ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
    sourceArtifacts: [
      {
        content: "# Description: Demo\n",
        label: "Final_Description.md",
        relativePath: ".codeai-hub/demo-workspace/description/Final_Description.md",
      },
    ],
    stage: "diagram_modules",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(
    pack.content.includes("Diagram Modules inline format contract:"),
    true
  );
  assert.equal(
    pack.content.includes("# Product Parts Index"),
    true
  );
  assert.equal(
    pack.content.includes("### Product Part: example-local-runtime"),
    true
  );
  assert.equal(
    pack.content.includes("| Part ID | `example-local-runtime` |"),
    true
  );
  assert.equal(
    pack.content.includes("| `workflow-step-runner` | Executes the active workflow step. |"),
    true
  );
  assert.equal(
    pack.content.includes(
      "Core provides this contract inline; do not search for template files"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "write only `product-parts.index.md` as the canonical index"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "do not create `product-parts/<part-id>.md` files in this initial turn"
    ),
    true
  );
  assert.equal(
    pack.content.includes("do not wait for user-visible continuation"),
    false
  );
});

test("non Diagram Modules prompt packs do not include Diagram Modules snippets", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "ru",
    chatLanguage: "ru",
    prompt: "Build Description.",
    questionnairePath: ".codeai-hub/demo-workspace/questionnaire.md",
    stage: "description",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(
    pack.content.includes("Diagram Modules inline format contract:"),
    false
  );
});
