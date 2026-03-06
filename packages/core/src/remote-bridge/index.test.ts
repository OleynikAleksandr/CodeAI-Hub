import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { DialogSendTraceRecord } from "../telemetry/dialog-send-trace-logger";
import { RemoteBridge } from "./index";

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
    source.includes("runtimeSessions:"),
    true,
    "dialog:list must pass runtime session collection to dialog-list-service"
  );
  assert.equal(
    source.includes(
      "this.sessionManager.getSessionsByWorkspacePath(workspaceRoot)"
    ),
    true,
    "dialog:list must pass workspace runtime sessions to dialog-list-service reconciliation"
  );
});

test("RemoteBridge records PM dialog trace events into dialog-send trace logger", () => {
  const traceRecords: DialogSendTraceRecord[] = [];
  const bridge = Object.create(RemoteBridge.prototype) as RemoteBridge & {
    readonly dialogSendTrace: {
      readonly record: (record: DialogSendTraceRecord) => void;
    };
  };

  Object.assign(bridge, {
    dialogSendTrace: {
      record: (record: DialogSendTraceRecord) => {
        traceRecords.push(record);
      },
    },
  });

  (bridge as any).handleDialogTrace("client-7", {
    event: "pm.dialog_send.history_refresh_result",
    requestId: "dialog-send-7",
    outboundAttemptId: "dialog-outbound-7",
    workspaceSlug: "workspace-beta",
    dialogId: "dialog-7",
    contentLength: 21,
    payload: {
      historyRequestId: "dialog-history-7",
      messageCount: 3,
    },
    error: null,
  });

  assert.equal(traceRecords.length, 1);
  assert.deepEqual(traceRecords[0], {
    event: "pm.dialog_send.history_refresh_result",
    outboundAttemptId: "dialog-outbound-7",
    requestId: "dialog-send-7",
    workspaceSlug: "workspace-beta",
    dialogId: "dialog-7",
    providerId: "unknown",
    contentLength: 21,
    payload: {
      clientId: "client-7",
      details: {
        historyRequestId: "dialog-history-7",
        messageCount: 3,
      },
    },
    error: undefined,
  });
});
