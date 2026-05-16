import assert from "node:assert/strict";
import test from "node:test";
import { buildDiagramModulesManagedPrompt } from "../index";
import {
  buildDiagramModulesProductPartContinuationPrompt,
  buildDiagramModulesProductPartRepairPrompt,
} from "./diagram-modules-prompt-builder";

const assertIncludes = (content: string, expected: string): void => {
  assert.equal(content.includes(expected), true);
};

test("diagram modules managed prompt embeds upstream sources and target artifacts", () => {
  const prompt = buildDiagramModulesManagedPrompt({
    workspaceRoot: "/workspace/demo",
    workspaceSlug: "demo-workspace",
    sources: [
      {
        absolutePath:
          "/workspace/demo/.codeai-hub/demo-workspace/description/Final_Description.md",
        content: "# Final Description\n\nСистема управляет проектами.",
        label: "Final_Description.md",
        relativePath:
          ".codeai-hub/demo-workspace/description/Final_Description.md",
      },
      {
        absolutePath:
          "/workspace/demo/.codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
        content: "# Virtual Simulation\n\n## Сценарий 1",
        label: "virtual-simulation.md",
        relativePath:
          ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
      },
    ],
  });

  assertIncludes(prompt, "Diagram Modules Managed Phase 1");
  assertIncludes(prompt, "Core has opened a managed Type A phase");
  assertIncludes(prompt, "Do not run Git commands");
  assertIncludes(prompt, "Do not edit child plans");
  assertIncludes(
    prompt,
    ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md"
  );
  assertIncludes(
    prompt,
    ".codeai-hub/demo-workspace/diagram_modules/product-parts/<part-id>.md"
  );
  assertIncludes(prompt, "### Final_Description.md");
  assertIncludes(prompt, "Система управляет проектами");
  assertIncludes(prompt, "### virtual-simulation.md");
  assertIncludes(prompt, "## Сценарий 1");
  assertIncludes(prompt, "## Embedded artifact contract templates");
  assertIncludes(prompt, "### product-parts-index-template");
  assertIncludes(prompt, "### product-part-template");
  assertIncludes(prompt, "### diagram-modules-field-reference");
  assertIncludes(prompt, "### diagram-modules-merge-rules");
  assertIncludes(prompt, "Canonical authoring rules:");
  assertIncludes(prompt, "| Part ID | `example-local-runtime` |");
  assertIncludes(prompt, "Fields in `product-parts.index.md`");
});

test("diagram modules continuation prompt embeds product part artifact contract", () => {
  const prompt = buildDiagramModulesProductPartContinuationPrompt({
    acceptedPartIds: [],
    currentPartId: "project-manager",
    expectedArtifactPath:
      ".codeai-hub/demo-workspace/diagram_modules/product-parts/project-manager.md",
  });

  assertIncludes(prompt, "### product-part-template");
  assertIncludes(prompt, "### diagram-modules-field-reference");
  assertIncludes(prompt, "Identity table must include Part ID");
});

test("diagram modules repair prompt embeds the target artifact contract", () => {
  const productPartRepair = buildDiagramModulesProductPartRepairPrompt({
    currentPartId: "project-manager",
    diagnostics: ["Missing required field: part_id"],
    workspaceSlug: "demo-workspace",
  });
  const indexRepair = buildDiagramModulesProductPartRepairPrompt({
    currentPartId: null,
    diagnostics: ["Diagram Modules index does not declare Product Part ids."],
    workspaceSlug: "demo-workspace",
  });

  assertIncludes(productPartRepair, "### product-part-template");
  assertIncludes(productPartRepair, "Missing required field: part_id");
  assertIncludes(indexRepair, "### product-parts-index-template");
  assertIncludes(indexRepair, "Every entry uses `### Product Part: <part-id>`");
});
