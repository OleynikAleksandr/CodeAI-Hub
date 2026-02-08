import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-scope-sync.ts"
);

test("workspace scope sync uses workspace:select with ack gating before activate", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("api.selectWorkspace({"), true);
  assert.equal(source.includes("const ack = await waitWorkspaceSelectAck(requestId);"), true);
  assert.equal(
    source.includes("ack.status !== \"applied\"") &&
      source.includes("ack.workspaceRoot !== params.workspace.path"),
    true,
    "workspace activation must be gated by applied workspace:select ack"
  );
  assert.equal(source.includes("activateAfterAck"), true);
});
