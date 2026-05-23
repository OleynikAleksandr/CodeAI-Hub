import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCoreWorkflowPromptPack } from "./workflow-prompt-pack-service";

const WORKSPACE_SLUG = "demo-workspace";
const APPLICATION_SKELETON_TEMPLATE_RE =
  /# Application Skeleton[\s\S]*## Overview[\s\S]*## Architecture[\s\S]*## Materialization/u;
const ARTIFACT_MODE_RE = /Workflow artifact mode:/u;
const CANONICAL_HEADINGS_RE =
  /Keep these headings exactly in English because Core validation treats them as canonical structural tokens/u;
const CORE_RUNTIME_LANGUAGE_RE =
  /Workflow runtime language contract:[\s\S]*Chat language code: `ru`/u;
const PRODUCT_PART_ARTIFACT_RE = /### Product Part: core-runtime/u;
const PRODUCT_PARTS_INDEX_RE = /### product-parts\.index\.md/u;
const DIAGRAM_INDEX_TEMPLATE_RE = /### product-parts-index-template/u;
const DIAGRAM_PART_TEMPLATE_RE = /### product-part-template/u;
const DIAGRAM_LEAD_FIELD_RE = /leadProductPartId/u;
const DIAGRAM_LEADERSHIP_ORDER_RE = /productPartLeadershipOrder/u;
const DIAGRAM_LEADERSHIP_RULES_RE = /Product Part leadership rules:/u;
const DIAGRAM_THIN_DISTRIBUTION_RULE_RE = /do not choose a thin distribution/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const prepareApplicationSkeletonInputs = async (
  workspaceRoot: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/description/Final_Description.md`,
    "# Final Description\n\nDesktop orchestration product.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/virtual-simulation.md`,
    "# Virtual Simulation\n\nRuntime starts managed stages.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
    [
      "# Product Parts Index",
      "",
      "## Product Parts",
      "",
      "### Product Part: core-runtime",
      "- Id: core-runtime",
      "- Title: Core Runtime",
      "- Purpose: Runs managed workflow.",
      "- Status: generated",
    ].join("\n")
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/core-runtime.md`,
    "# Product Part: Core Runtime\n\n## Identity\n\nCore runtime part.\n"
  );
};

test("Core workflow prompt pack owns Application Skeleton sources and template", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "core-workflow-prompt-pack-")
  );
  try {
    await prepareApplicationSkeletonInputs(workspaceRoot);

    const promptPack = await buildCoreWorkflowPromptPack({
      artifactLanguage: "ru",
      chatLanguage: "ru",
      stage: "application_skeleton",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.ok(promptPack);
    assert.equal(
      promptPack.relativePath,
      `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`
    );
    assert.equal(
      promptPack.inputPath,
      `.codeai-hub/${WORKSPACE_SLUG}/description/Final_Description.md`
    );
    assert.match(promptPack.content, CORE_RUNTIME_LANGUAGE_RE);
    assert.match(promptPack.content, PRODUCT_PARTS_INDEX_RE);
    assert.match(promptPack.content, PRODUCT_PART_ARTIFACT_RE);
    assert.match(promptPack.content, CANONICAL_HEADINGS_RE);
    assert.match(promptPack.content, APPLICATION_SKELETON_TEMPLATE_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Core workflow prompt pack targets every workflow stage without PM rules", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "core-workflow-prompt-pack-targets-")
  );
  try {
    for (const [stage, target] of [
      ["description", "description/Final_Description.md"],
      ["virtual_simulation", "virtual_simulation/virtual-simulation.md"],
      ["diagram_modules", "diagram_modules/product-parts.index.md"],
      ["application_skeleton", "application_skeleton/application-skeleton.md"],
      ["quality_gates", "quality_gates/quality-gates.md"],
    ] as const) {
      const promptPack = await buildCoreWorkflowPromptPack({
        stage,
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });
      assert.ok(promptPack);
      assert.equal(
        promptPack.relativePath,
        `.codeai-hub/${WORKSPACE_SLUG}/${target}`
      );
      assert.match(promptPack.content, ARTIFACT_MODE_RE);
      if (stage === "diagram_modules") {
        assert.match(promptPack.content, DIAGRAM_INDEX_TEMPLATE_RE);
        assert.match(promptPack.content, DIAGRAM_PART_TEMPLATE_RE);
        assert.match(promptPack.content, DIAGRAM_LEAD_FIELD_RE);
        assert.match(promptPack.content, DIAGRAM_LEADERSHIP_ORDER_RE);
        assert.match(promptPack.content, DIAGRAM_LEADERSHIP_RULES_RE);
        assert.match(promptPack.content, DIAGRAM_THIN_DISTRIBUTION_RULE_RE);
      }
    }
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
