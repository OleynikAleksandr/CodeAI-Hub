import assert from "node:assert/strict";
import test from "node:test";
import { DialogSendTraceClient } from "../../services/dialog-send-trace-client";

test("dialog send trace client correlates one outbound attempt through ack and history refresh", () => {
  const traces: {
    readonly type: string;
    readonly payload: Record<string, unknown>;
  }[] = [];
  const client = new DialogSendTraceClient((message) => {
    traces.push(
      message as { readonly type: string; readonly payload: Record<string, unknown> }
    );
  });

  client.registerSendAttempt({
    requestId: "dialog-send-1",
    outboundAttemptId: "dialog-outbound-1",
    workspaceSlug: "workspace-alpha",
    dialogId: "dialog-42",
    contentLength: 12,
  });
  client.traceDialogSendDispatch({
    type: "dialog:send",
    payload: {
      requestId: "dialog-send-1",
      outboundAttemptId: "dialog-outbound-1",
      workspaceSlug: "workspace-alpha",
      dialogId: "dialog-42",
      content: "hello world!",
    },
  });
  client.handleIncomingMessage({
    type: "dialog:send:ack",
    payload: {
      requestId: "dialog-send-1",
      workspaceSlug: "workspace-alpha",
      dialogId: "dialog-42",
      status: "sent",
      error: null,
    },
  });
  client.traceDialogHistoryDispatch({
    type: "dialog:history",
    payload: {
      requestId: "dialog-history-1",
      workspaceSlug: "workspace-alpha",
      dialogId: "dialog-42",
      cursor: 7,
    },
  });
  client.handleIncomingMessage({
    type: "dialog:history:result",
    payload: {
      requestId: "dialog-history-1",
      workspaceSlug: "workspace-alpha",
      dialogId: "dialog-42",
      lastCursor: 8,
      messages: [{ role: "user", content: "hello world!" }],
      error: null,
    },
  });

  assert.deepEqual(
    traces.map((entry) => entry.payload.event),
    [
      "pm.dialog_send.clicked",
      "pm.dialog_send.ws_dispatched",
      "pm.dialog_send.ack_received",
      "pm.dialog_send.history_refresh_requested",
      "pm.dialog_send.history_refresh_result",
    ]
  );
  for (const entry of traces) {
    assert.equal(entry.payload.outboundAttemptId, "dialog-outbound-1");
    assert.equal(entry.payload.requestId, "dialog-send-1");
  }
  assert.deepEqual(traces[3]?.payload.payload, {
    historyRequestId: "dialog-history-1",
    cursor: 7,
  });
  assert.deepEqual(traces[4]?.payload.payload, {
    historyRequestId: "dialog-history-1",
    lastCursor: 8,
    messageCount: 1,
  });
});
