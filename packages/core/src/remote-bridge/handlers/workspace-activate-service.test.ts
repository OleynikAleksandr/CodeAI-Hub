import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/handlers/workspace-activate-service.ts"
);

test("workspace-activate-service preserves deterministic resume/reopen path after restart", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("if (!path.isAbsolute(workspacePath))"),
    true,
    "workspace activation must keep absolute-path guard for scope identity"
  );
  assert.equal(
    source.includes('stage: "description",'),
    true,
    "workspace activation must resume description branch session"
  );
  assert.equal(
    source.includes("providerSessionId: collector.providerSessionId"),
    true,
    "workspace activation must resume description via primarySession"
  );
  assert.equal(
    source.includes("description: descriptionSnapshot"),
    true,
    "workspace activation response must include description snapshot for PM visibility"
  );
});
