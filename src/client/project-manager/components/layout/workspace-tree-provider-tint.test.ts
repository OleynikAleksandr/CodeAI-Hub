import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const WORKSPACE_TREE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree.tsx"
);
const RESOLVER_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-step-provider-resolver.ts"
);
const STYLES_PATH = path.resolve(
  process.cwd(),
  "packages/ui/project-manager/styles.css"
);

test("workspace tree imports the step provider resolver hook", async () => {
  const source = await readFile(WORKSPACE_TREE_PATH, "utf8");
  assert.equal(
    source.includes(
      'import { useStepProviderResolver } from "./use-step-provider-resolver";'
    ),
    true
  );
  assert.equal(source.includes("useStepProviderResolver({"), true);
});

test("trunk rows carry data-provider derived from resolver", async () => {
  const source = await readFile(WORKSPACE_TREE_PATH, "utf8");
  assert.equal(source.includes("providerResolver.forStage(node.stage)"), true);
  assert.equal(source.includes("data-provider={trunkProvider}"), true);
});

test("development-tree rows carry data-provider on row, cluster, and pp wrapper", async () => {
  const source = await readFile(WORKSPACE_TREE_PATH, "utf8");
  assert.equal(
    source.includes("providerResolver.forBranchModule(node.id)"),
    true
  );
  assert.equal(
    source.includes("providerResolver.forBranchCluster(node.id)"),
    true
  );
  assert.equal(
    source.includes("providerResolver.forBranchPart(node.id)"),
    true
  );
  assert.equal(source.includes("data-provider={partProvider}"), true);
});

test("resolver maps provider stack ids to canonical sidebar design ids", async () => {
  const source = await readFile(RESOLVER_PATH, "utf8");
  assert.equal(source.includes('claudeCodeCli: "claude"'), true);
  assert.equal(source.includes('codexCli: "codex"'), true);
});

test("css scheme defines provider variables and removes legacy yellow / green from progress / active markers", async () => {
  const source = await readFile(STYLES_PATH, "utf8");
  assert.equal(
    source.includes('.pm-tree__item[data-provider="claude"]'),
    true,
    "claude provider scope must exist"
  );
  assert.equal(
    source.includes('.pm-tree__item[data-provider="codex"]'),
    true,
    "codex provider scope must exist"
  );
  assert.equal(
    source.includes(".pm-tree__item[data-provider].pm-tree__item--progress"),
    true,
    "progress overrides must scope under [data-provider]"
  );
  assert.equal(
    source.includes(".pm-tree__item[data-provider].pm-tree__item--active"),
    true,
    "active overrides must scope under [data-provider]"
  );
  assert.equal(
    source.includes("background: var(--row-soft);"),
    true,
    "progress marker must use --row-soft (replaces #d9a441)"
  );
});
