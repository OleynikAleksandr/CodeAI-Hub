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

test("RemoteBridge handles workspace:select and routes through runtime facade", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('case "workspace:select":'),
    true,
    "incoming websocket stream must handle workspace select messages"
  );
  assert.equal(
    source.includes("this.handleWorkspaceSelect(clientId, incoming.payload);"),
    true,
    "workspace:select branch must route payload to select handler"
  );
  assert.equal(
    source.includes("const ack = this.workspaceRuntime.select({"),
    true,
    "select handler must delegate selection to workspace runtime facade"
  );
  assert.equal(
    source.includes("workspaceRuntime: this.workspaceRuntime,"),
    true,
    "session request handler wiring must receive runtime facade instance"
  );
  assert.equal(
    source.includes('type: "workspace:select:ack",'),
    true,
    "workspace select handler must send explicit ack to the same client"
  );
});

test("RemoteBridge binds workflow watcher on session:create with workspace context", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("const resolvedWorkspacePath ="),
    true,
    "session:create path must resolve workspace path before create"
  );
  assert.equal(
    source.includes("const initiativeSlug = incoming.payload?.initiativeSlug"),
    true,
    "session:create path must capture initiative/workflow slug"
  );
  assert.equal(
    source.includes("await this.workflowRuntime.connectWorkspace({"),
    true,
    "session:create path must connect workflow runtime when workspace context is present"
  );
  assert.equal(
    source.includes('"Failed to connect workflow runtime from session:create"'),
    true,
    "session:create path must log workflow watcher bind failures without breaking create"
  );
});

test("RemoteBridge dialog:list wires runtime sessions for latestSessionId reconciliation", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes(
      "runtimeSessions: this.sessionManager.getSessionsByWorkspacePath("
    ),
    true,
    "dialog:list must pass workspace runtime sessions to dialog-list-service reconciliation"
  );
});
