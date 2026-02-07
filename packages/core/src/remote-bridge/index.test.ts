import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/index.ts"
);

test("RemoteBridge handles workspace:scope:set and responds with workspace:scope:ack", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('case "workspace:scope:set":'),
    true,
    "incoming websocket stream must handle workspace scope sync messages"
  );
  assert.equal(
    source.includes(
      "this.handleWorkspaceScopeSet(clientId, incoming.payload);"
    ),
    true,
    "scope:set branch must route payload to scope handler"
  );
  assert.equal(
    source.includes(
      "const ack = wsManager.setWorkspaceScope(clientId, payload);"
    ),
    true,
    "scope handler must apply per-client scope and capture ack payload"
  );
  assert.equal(
    source.includes('type: "workspace:scope:ack",'),
    true,
    "scope handler must send explicit ack to the same client"
  );
});
