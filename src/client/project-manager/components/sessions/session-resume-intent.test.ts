import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/session-resume-intent.ts"
);

test("session resume intent waits for workspace:select ack and does not use legacy scope handshake", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("api.selectWorkspace({"), true);
  assert.equal(
    source.includes('message.type !== "workspace:select:ack"'),
    false,
    "resume intent must not hard-block on ws ack (dead click on cold start)"
  );
  assert.equal(
    source.includes("syncWorkspaceScopeWithAck"),
    false,
    "resume intent must not depend on legacy workspace:scope:set handshake"
  );
});
