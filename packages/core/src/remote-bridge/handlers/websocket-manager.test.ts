import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/handlers/websocket-manager.ts"
);

test("WebSocketManager keeps workspace-scoped delivery guard for session events", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("shouldDeliverEventForScope({"),
    true,
    "broadcast must filter session events by client scope"
  );
  assert.equal(
    source.includes(
      "client.scope = { enabled: true, workspacePath: parsed.workspacePath };"
    ),
    true,
    "scope:set must enable per-client workspace scope"
  );
  assert.equal(
    source.includes("scope: { enabled: false, workspacePath: null },"),
    true,
    "new clients must start with explicit unscoped state"
  );
});
