import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDevelopmentTreeMaterializedRoot } from "../filesystem-structurator/development-tree-filesystem-paths";
import { DevelopmentTreeNodeBootstrapFacade } from "./development-tree-node-bootstrap-facade";
import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import { DraftWriter } from "./draft-writer";

const GENERATED_HASH_ONE_PATTERN = /derivedHash: "sha256:first"/;
const GENERATED_HASH_TWO_PATTERN = /derivedHash: "sha256:second"/;
const AGENT_NOTE_PATTERN = /Keep this implementation note\./;
const MODULE_SPEC_TITLE_PATTERN = /# ModuleSpec\n/;
const MODULE_SPEC_PATH = "ModuleSpec.draft.md";
const MODULE_CONTRACT_PATH = "ModuleFacadeContract.draft.md";
const AGENT_FILL_SENTINEL =
  "_CODEAI_AGENT_FILL_SENTINEL: replace this line with draft content._";
const MODULE_NODE_RELATIVE_PATH =
  ".codeai-hub/demo/development_tree/materialized/product-parts/local-runtime/modules/provider-bridge";

const createModuleNode = (
  workspaceRoot: string
): DevelopmentTreeDetectedNode => {
  const absolutePath = path.join(workspaceRoot, MODULE_NODE_RELATIVE_PATH);
  return {
    absolutePath,
    id: "provider-bridge",
    kind: "module",
    partId: "local-runtime",
    relativePath: MODULE_NODE_RELATIVE_PATH,
  };
};

const replaceResponsibilityAgentFill = (content: string): string =>
  content.replace(
    `## Responsibility\n\n<!-- agent-fill -->\n${AGENT_FILL_SENTINEL}\n<!-- /agent-fill -->`,
    "## Responsibility\n<!-- agent-fill -->\nKeep this implementation note.\n<!-- /agent-fill -->"
  );

test("DraftWriter creates structural drafts for a new module folder", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "draft-writer-"));
  try {
    const node = createModuleNode(workspaceRoot);
    const result = await new DraftWriter().writeDrafts({
      derivedHash: "sha256:first",
      generatedAt: "2026-05-04T10:00:00.000Z",
      node,
    });

    assert.deepEqual(
      result.drafts.map((draft) => `${draft.fileName}:${draft.action}`),
      [`${MODULE_SPEC_PATH}:created`, `${MODULE_CONTRACT_PATH}:created`]
    );
    const spec = await readFile(
      path.join(node.absolutePath, MODULE_SPEC_PATH),
      "utf8"
    );
    assert.match(spec, GENERATED_HASH_ONE_PATTERN);
    assert.match(spec, MODULE_SPEC_TITLE_PATTERN);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DraftWriter updates generated content while preserving agent-fill blocks", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "draft-writer-"));
  try {
    const node = createModuleNode(workspaceRoot);
    await new DraftWriter().writeDrafts({
      derivedHash: "sha256:first",
      generatedAt: "2026-05-04T10:00:00.000Z",
      node,
    });
    const specPath = path.join(node.absolutePath, MODULE_SPEC_PATH);
    const specWithAgentNote = replaceResponsibilityAgentFill(
      await readFile(specPath, "utf8")
    );
    await writeFile(specPath, specWithAgentNote, "utf8");

    const result = await new DraftWriter().writeDrafts({
      derivedHash: "sha256:second",
      generatedAt: "2026-05-04T11:00:00.000Z",
      node,
    });

    const spec = await readFile(specPath, "utf8");
    assert.equal(
      result.drafts.find((draft) => draft.fileName === MODULE_SPEC_PATH)
        ?.action,
      "updated"
    );
    assert.match(spec, GENERATED_HASH_TWO_PATTERN);
    assert.match(spec, AGENT_NOTE_PATTERN);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeNodeBootstrapFacade materializes drafts for consumed nodes", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "draft-writer-"));
  try {
    const root = createDevelopmentTreeMaterializedRoot({
      workspaceRoot,
      workspaceSlug: "demo",
    });
    await mkdir(
      path.join(
        root.absolutePath,
        "product-parts/local-runtime/modules/provider-bridge"
      ),
      { recursive: true }
    );

    const result =
      await new DevelopmentTreeNodeBootstrapFacade().consumeNewNodes({
        workspaceRoot,
        workspaceSlug: "demo",
      });

    assert.deepEqual(
      result.writtenDrafts.map((draft) => draft.fileName),
      [
        "ProductPartDevelopmentBrief.draft.md",
        MODULE_SPEC_PATH,
        MODULE_CONTRACT_PATH,
      ]
    );
    assert.equal(result.processedCount, 2);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
