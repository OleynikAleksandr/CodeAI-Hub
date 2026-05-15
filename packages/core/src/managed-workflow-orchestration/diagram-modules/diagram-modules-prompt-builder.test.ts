import assert from "node:assert/strict";
import test from "node:test";
import { buildDiagramModulesManagedPrompt } from "../index";

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
});
