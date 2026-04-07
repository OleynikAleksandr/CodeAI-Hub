import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const BRANCH_NODES_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts"
);
const AUTO_SELECT_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree-auto-select.ts"
);
const STAGE_SYNC_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-stage-panel-sync.ts"
);

test("foundation envelope tree parity keeps canonical artifact and session sync wiring", async () => {
  const branchNodesSource = await readFile(BRANCH_NODES_SOURCE_PATH, "utf8");
  const autoSelectSource = await readFile(AUTO_SELECT_SOURCE_PATH, "utf8");
  const stageSyncSource = await readFile(STAGE_SYNC_SOURCE_PATH, "utf8");

  assert.equal(
    branchNodesSource.includes(
      'id: "workflow:foundation_envelope:artifact"'
    ),
    true
  );
  assert.equal(
    branchNodesSource.includes("foundation-envelope.md"),
    true
  );
  assert.equal(
    branchNodesSource.includes("foundationEnvelopeArtifactAvailable"),
    true
  );
  assert.equal(branchNodesSource.includes("options.selectArtifact("), true);
  assert.equal(
    autoSelectSource.includes(
      "resolveStageSyncPayload({"
    ),
    true
  );
  assert.equal(
    autoSelectSource.includes(
      ".codeai-hub/${params.workspaceSlug}/foundation_envelope/foundation-envelope.md"
    ),
    false
  );
  assert.equal(
    stageSyncSource.includes(
      "const p = resolveStageSyncPayload({"
    ),
    true
  );
});
