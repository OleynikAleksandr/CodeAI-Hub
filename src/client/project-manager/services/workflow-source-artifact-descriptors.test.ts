import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProductPartSourceArtifactDescriptors,
  buildWorkflowSourceArtifactDescriptors,
} from "./workflow-source-artifact-descriptors";

test("application skeleton source descriptors include upstream docs and product parts index", () => {
  assert.deepEqual(
    buildWorkflowSourceArtifactDescriptors({
      questionnairePath:
        ".codeai-hub/demo/diagram_modules/product-parts.index.md",
      stage: "application_skeleton",
      workspaceSlug: "demo",
    }),
    [
      {
        label: "Final_Description.md",
        relativePath: ".codeai-hub/demo/description/Final_Description.md",
      },
      {
        label: "virtual-simulation.md",
        relativePath:
          ".codeai-hub/demo/virtual_simulation/virtual-simulation.md",
      },
      {
        label: "product-parts.index.md",
        relativePath:
          ".codeai-hub/demo/diagram_modules/product-parts.index.md",
      },
    ]
  );
});

test("product part descriptors are derived from safe unique index ids", () => {
  const descriptors = buildProductPartSourceArtifactDescriptors({
    productPartsIndexContent: [
      "### Product Part: project-manager",
      "- Id: `project-manager`",
      "- Id: `project-manager`",
      "- Id: `../unsafe`",
      "- Id: `core-runtime`",
    ].join("\n"),
    workspaceSlug: "demo",
  });

  assert.deepEqual(descriptors, [
    {
      label: "Product Part: project-manager",
      relativePath:
        ".codeai-hub/demo/diagram_modules/product-parts/project-manager.md",
    },
    {
      label: "Product Part: core-runtime",
      relativePath:
        ".codeai-hub/demo/diagram_modules/product-parts/core-runtime.md",
    },
  ]);
});
