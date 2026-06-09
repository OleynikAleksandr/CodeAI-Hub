import assert from "node:assert/strict";
import test from "node:test";
import type { SessionMessage, SessionSnapshot } from "../../../../types/session";
import { appendDedupedSessionMessageToSnapshots } from "./session-message-dedupe";

const createSnapshot = (params?: {
  readonly connectionState?: "idle" | "running" | "blocked";
  readonly lockActive?: boolean;
  readonly lockReason?: string;
}): SessionSnapshot => {
  const now = Date.now();
  return {
    binding: {
      providerSessionId: "provider-session",
      status: "ready",
    },
    draft: "",
    messages: [],
    status: {
      connectionState: params?.connectionState ?? "idle",
      continuityLock: {
        active: params?.lockActive ?? false,
        ...(params?.lockReason ? { reason: params.lockReason } : {}),
        updatedAt: now,
      },
      providerSummary: "Claude",
      tokenUsage: {
        limit: 200_000,
        used: 0,
      },
      updatedAt: now,
    },
    todos: [],
  };
};

const createSystemMessage = (
  id: string,
  tag: string,
  content = "Core message"
): SessionMessage => ({
  content,
  createdAt: Date.now(),
  id,
  role: "system",
  tag,
});

const createUserMessage = (
  id: string,
  tag: string,
  content = "Core continuation user turn"
): SessionMessage => ({
  content,
  createdAt: Date.now(),
  id,
  role: "user",
  tag,
});

test("managed workflow continuation message locks the user input", () => {
  const snapshots = { session: createSnapshot() };

  const next = appendDedupedSessionMessageToSnapshots(snapshots, {
    message: createSystemMessage(
      "continuation-1",
      "managed-workflow-continuation"
    ),
    sessionId: "session",
  });

  assert.equal(next.session.status.connectionState, "blocked");
  assert.equal(next.session.status.continuityLock?.active, true);
  assert.equal(
    next.session.status.continuityLock?.reason,
    "managed_workflow_core_agent_turn"
  );
});

test("managed workflow user continuation message locks the user input", () => {
  const snapshots = { session: createSnapshot() };

  const next = appendDedupedSessionMessageToSnapshots(snapshots, {
    message: createUserMessage(
      "continuation-user-1",
      "managed-workflow-continuation"
    ),
    sessionId: "session",
  });

  assert.equal(next.session.status.connectionState, "blocked");
  assert.equal(next.session.status.continuityLock?.active, true);
  assert.equal(
    next.session.status.continuityLock?.reason,
    "managed_workflow_core_agent_turn"
  );
});

test("managed workflow user review releases only the managed continuation lock", () => {
  const snapshots = {
    session: createSnapshot({
      connectionState: "blocked",
      lockActive: true,
      lockReason: "managed_workflow_core_agent_turn",
    }),
  };

  const next = appendDedupedSessionMessageToSnapshots(snapshots, {
    message: createSystemMessage(
      "review-1",
      "managed-workflow-user-review",
      "Core hands control back to the user."
    ),
    sessionId: "session",
  });

  assert.equal(next.session.status.connectionState, "idle");
  assert.equal(next.session.status.continuityLock?.active, false);
});

test("managed workflow user review releases initial workflow running state", () => {
  const snapshots = {
    session: createSnapshot({
      connectionState: "running",
      lockActive: false,
    }),
  };

  const next = appendDedupedSessionMessageToSnapshots(snapshots, {
    message: createSystemMessage(
      "review-1",
      "managed-workflow-user-review",
      "Core hands control back to the user."
    ),
    sessionId: "session",
  });

  assert.equal(next.session.status.connectionState, "idle");
  assert.equal(next.session.status.continuityLock?.active, false);
});

test("managed workflow user review does not release an unrelated continuity lock", () => {
  const snapshots = {
    session: createSnapshot({
      connectionState: "blocked",
      lockActive: true,
      lockReason: "resume_bootstrap",
    }),
  };

  const next = appendDedupedSessionMessageToSnapshots(snapshots, {
    message: createSystemMessage(
      "review-1",
      "managed-workflow-user-review",
      "Core hands control back to the user."
    ),
    sessionId: "session",
  });

  assert.equal(next.session.status.connectionState, "blocked");
  assert.equal(next.session.status.continuityLock?.active, true);
  assert.equal(next.session.status.continuityLock?.reason, "resume_bootstrap");
});
