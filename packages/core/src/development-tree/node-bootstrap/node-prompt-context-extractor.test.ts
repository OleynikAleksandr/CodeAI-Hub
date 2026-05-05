import assert from "node:assert/strict";
import test from "node:test";
import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import { NodePromptContextExtractor } from "./node-prompt-context-extractor";

const PROJECT_MANAGER_PATTERN = /Project Manager owns workflow coordination/;
const CORE_RUNTIME_PATTERN = /Core Runtime owns provider processes/;
const ARTIFACT_WORKSPACE_PATTERN =
  /Artifact Workspace presents editable drafts/;
const STEP_NAVIGATION_PATTERN = /Workflow Step Navigation chooses current step/;
const WORKFLOW_ARTIFACT_CLUSTER_PATTERN = /workflow-artifact-ui/;
const DIAGRAM_MODULES_INDEX_CONTEXT_PATTERN =
  /project-manager owns the Project Manager product part/;
const PRODUCT_PART_PURPOSE_PATTERN =
  /Project Manager is the primary workspace for artifact review/;
const PRODUCT_PART_RELATION_PATTERN =
  /workflow-step-navigation` \| `artifact-review-workspace` \| sync-call/;
const LONG_CONTEXT_PATTERN = /Project Manager repeated context/;
const LONG_TEXT = `${"Project Manager repeated context ".repeat(120)}tail`;

const createNode = (
  overrides: Partial<DevelopmentTreeDetectedNode>
): DevelopmentTreeDetectedNode => ({
  absolutePath:
    "/workspace/.codeai-hub/demo/development_tree/materialized/product-parts/project-manager",
  id: "project-manager",
  kind: "product_part",
  partId: "project-manager",
  relativePath:
    ".codeai-hub/demo/development_tree/materialized/product-parts/project-manager",
  ...overrides,
});

test("NodePromptContextExtractor keeps product part context and drops unrelated sections", () => {
  const context = new NodePromptContextExtractor().extract({
    artifacts: [
      {
        content: [
          "# Final Description",
          "## Project Manager",
          "Project Manager owns workflow coordination.",
          "## Core Runtime",
          "Core Runtime owns provider processes.",
        ].join("\n"),
        label: "Final Description",
        relativePath: ".codeai-hub/demo/description/Final_Description.md",
      },
    ],
    node: createNode({}),
  });
  const content = context.map((entry) => entry.content).join("\n");

  assert.match(content, PROJECT_MANAGER_PATTERN);
  assert.doesNotMatch(content, CORE_RUNTIME_PATTERN);
});

test("NodePromptContextExtractor scopes module context through part and cluster anchors", () => {
  const context = new NodePromptContextExtractor().extract({
    artifacts: [
      {
        content: [
          "Product Part: project-manager",
          "Cluster: workflow-artifact-ui",
          "Module: workflow-step-navigation",
          "Workflow Step Navigation chooses current step.",
          "Module: artifact-workspace",
          "Artifact Workspace presents editable drafts.",
          "Cluster: session-workspace",
          "Module: provider-session-console",
          "Provider Session Console streams provider output.",
        ].join("\n"),
        label: "Diagram Modules Product Part: project-manager",
        relativePath:
          ".codeai-hub/demo/diagram_modules/product-parts/project-manager.md",
      },
    ],
    node: createNode({
      absolutePath:
        "/workspace/.codeai-hub/demo/development_tree/materialized/product-parts/project-manager/clusters/workflow-artifact-ui/modules/artifact-workspace",
      clusterId: "workflow-artifact-ui",
      id: "artifact-workspace",
      kind: "module",
      relativePath:
        ".codeai-hub/demo/development_tree/materialized/product-parts/project-manager/clusters/workflow-artifact-ui/modules/artifact-workspace",
    }),
  });
  const content = context.map((entry) => entry.content).join("\n");

  assert.match(content, ARTIFACT_WORKSPACE_PATTERN);
  assert.match(content, WORKFLOW_ARTIFACT_CLUSTER_PATTERN);
  assert.doesNotMatch(content, STEP_NAVIGATION_PATTERN);
});

test("NodePromptContextExtractor includes detailed product part artifact for part nodes", () => {
  const exactProductPartMarkdown = [
    "# Product Part: Project Manager",
    "",
    "## Identity",
    "",
    "| Field | Value |",
    "| --- | --- |",
    "| Part ID | `project-manager` |",
    "",
    "## Purpose",
    "",
    "Project Manager is the primary workspace for artifact review.",
    "",
    "## Owned Clusters",
    "",
    "### `workflow-artifact-ui`",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    "| `artifact-workspace` | Presents editable drafts. |",
    "",
    "### `session-workspace-ui`",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    "| `project-context-hub` | Keeps active project context. |",
    "",
    "## Standalone Modules",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    "| `cef-launcher` | Starts the desktop shell. |",
    "",
    "## Simple Relations",
    "",
    "| From | To | Type | Label |",
    "| --- | --- | --- | --- |",
    "| `workflow-step-navigation` | `artifact-review-workspace` | sync-call | open-active-artifact |",
  ].join("\n");
  const context = new NodePromptContextExtractor().extract({
    artifacts: [
      {
        content: [
          "# Final Description",
          "## Project Manager",
          "Project Manager overview that should not displace exact owner markdown.",
          "## Project Manager Shell",
          "Project Manager shell context also matches the same broad anchor.",
          "## Project Manager Setup",
          "Project Manager setup context also matches the same broad anchor.",
        ].join("\n"),
        label: "Final Description",
        relativePath: ".codeai-hub/demo/description/Final_Description.md",
      },
      {
        content: [
          "# Virtual Simulation",
          "## Project Manager scenario",
          "Project Manager scenario context also matches the same broad anchor.",
          "## Project Manager recovery",
          "Project Manager recovery context also matches the same broad anchor.",
          "## Project Manager settings",
          "Project Manager settings context also matches the same broad anchor.",
        ].join("\n"),
        label: "Virtual Simulation",
        relativePath:
          ".codeai-hub/demo/virtual_simulation/virtual-simulation.md",
      },
      {
        content: [
          "Product Part: project-manager",
          "project-manager owns the Project Manager product part.",
        ].join("\n"),
        label: "Diagram Modules Index",
        relativePath: ".codeai-hub/demo/diagram_modules/product-parts.index.md",
      },
      {
        content: exactProductPartMarkdown,
        label: "Diagram Modules Product Part: project-manager",
        relativePath:
          ".codeai-hub/demo/diagram_modules/product-parts/project-manager.md",
      },
    ],
    node: createNode({}),
  });
  const content = context.map((entry) => entry.content).join("\n");
  const exactEntry = context.find((entry) =>
    entry.relativePath.endsWith(
      "/diagram_modules/product-parts/project-manager.md"
    )
  );

  assert.match(content, DIAGRAM_MODULES_INDEX_CONTEXT_PATTERN);
  assert.match(content, PRODUCT_PART_PURPOSE_PATTERN);
  assert.match(content, PRODUCT_PART_RELATION_PATTERN);
  assert.equal(exactEntry?.content, exactProductPartMarkdown);
  assert.equal(exactEntry?.truncated, false);
});

test("NodePromptContextExtractor marks long scoped snippets as truncated", () => {
  const context = new NodePromptContextExtractor().extract({
    artifacts: [
      {
        content: `## Project Manager\n${LONG_TEXT}`,
        label: "Final Description",
        relativePath: ".codeai-hub/demo/description/Final_Description.md",
      },
    ],
    node: createNode({}),
  });

  assert.equal(context.length, 1);
  assert.equal(context[0]?.truncated, true);
  assert.match(context[0]?.content ?? "", LONG_CONTEXT_PATTERN);
});
