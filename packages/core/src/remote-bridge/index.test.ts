import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const INDEX_SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/index.ts"
);
const ROUTER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/remote-bridge-message-router.ts"
);
const DIALOG_ROUTER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/remote-bridge-dialog-command-router.ts"
);
const WORKSPACE_ROUTER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/remote-bridge-workspace-command-router.ts"
);
const WORKSPACE_SELECT_DELEGATION_PATTERN =
  /this\.workspaceCommandRouter\.handleWorkspaceSelect\(\s*clientId,\s*incoming\.payload\s*\)/;
const DIALOG_LIST_DELEGATION_PATTERN =
  /await this\.dialogCommandRouter\.handleDialogList\(\s*clientId,\s*incoming\.payload\s*\)/;
const DIALOG_RUNTIME_SESSIONS_PATTERN =
  /runtimeSessions: this\.deps\.sessionManager\.getSessionsByWorkspacePath\(\s*scoped\.workspaceRoot\s*\)/;

test("RemoteBridge delegates websocket command routing to RemoteBridgeMessageRouter", async () => {
  const source = await readFile(INDEX_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("new RemoteBridgeMessageRouter({"),
    true,
    "remote bridge facade must wire the dedicated websocket command router"
  );
  assert.equal(
    source.includes(
      "await this.messageRouter.handleIncomingMessage(clientId, incoming);"
    ),
    true,
    "server lifecycle must delegate incoming websocket payloads to the command router"
  );
});

test("RemoteBridgeMessageRouter delegates workspace scope commands to the dedicated workspace helper", async () => {
  const source = await readFile(ROUTER_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('case "workspace:scope:set":'),
    true,
    "command router must handle workspace scope sync messages"
  );
  assert.equal(
    source.includes("this.workspaceCommandRouter.handleWorkspaceScopeSet("),
    true,
    "workspace scope sync branch must delegate to the workspace command helper"
  );
  assert.equal(
    WORKSPACE_SELECT_DELEGATION_PATTERN.test(source),
    true,
    "workspace select branch must delegate to the workspace command helper"
  );
});

test("RemoteBridgeWorkspaceCommandRouter handles workspace scope sync and workspace selection", async () => {
  const source = await readFile(WORKSPACE_ROUTER_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('type: "workspace:scope:ack",'),
    true,
    "scope:set branch must return explicit ack to the same client"
  );
  assert.equal(
    source.includes("const ack = this.deps.workspaceRuntime.select({"),
    true,
    "workspace:select branch must delegate selection to workspace runtime facade"
  );
  assert.equal(
    source.includes('type: "workspace:select:ack",'),
    true,
    "workspace select handler must send explicit ack to the same client"
  );
});

test("RemoteBridgeMessageRouter binds workflow watcher on session:create with workspace context", async () => {
  const source = await readFile(ROUTER_SOURCE_PATH, "utf8");

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
    source.includes("await this.deps.workflowRuntime.connectWorkspace({"),
    true,
    "session:create path must connect workflow runtime when workspace context is present"
  );
  assert.equal(
    source.includes('"Failed to connect workflow runtime from session:create"'),
    true,
    "session:create path must log workflow watcher bind failures without breaking create"
  );
});

test("RemoteBridgeMessageRouter delegates dialog commands and preserves runtime session reconciliation", async () => {
  const routerSource = await readFile(ROUTER_SOURCE_PATH, "utf8");
  const dialogSource = await readFile(DIALOG_ROUTER_SOURCE_PATH, "utf8");

  assert.equal(
    DIALOG_LIST_DELEGATION_PATTERN.test(routerSource),
    true,
    "dialog:list branch must delegate to the dedicated dialog command helper"
  );
  assert.equal(
    DIALOG_RUNTIME_SESSIONS_PATTERN.test(dialogSource),
    true,
    "dialog:list must pass workspace runtime sessions to dialog-list-service reconciliation"
  );
});
