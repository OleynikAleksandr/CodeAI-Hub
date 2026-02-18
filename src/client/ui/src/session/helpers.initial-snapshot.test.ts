import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
import { createInitialSnapshot } from "./helpers";

const createSessionRecord = (
  overrides: Partial<SessionRecord>
): SessionRecord => ({
  id: "session-1",
  title: "Test Session",
  providerIds: ["codexCli"],
  workspacePath: "/workspace",
  stage: null,
  runSlug: null,
  sessionKind: null,
  createdAt: Date.now(),
  binding: { providerSessionId: null, status: "pending" },
  ...overrides,
});

test("createInitialSnapshot locks description collector sessions immediately", () => {
  const session = createSessionRecord({
    stage: "description",
    sessionKind: "collector",
  });
  const snapshot = createInitialSnapshot(
    session,
    new Map<ProviderStackId, string>([["codexCli", "Codex"]]),
    null
  );

  assert.equal(snapshot.status.connectionState, "running");
});

test("createInitialSnapshot locks reviewer sessions immediately", () => {
  const session = createSessionRecord({
    stage: "description",
    sessionKind: "reviewer",
  });
  const snapshot = createInitialSnapshot(
    session,
    new Map<ProviderStackId, string>([["codexCli", "Codex"]]),
    null
  );

  assert.equal(snapshot.status.connectionState, "running");
});

test("createInitialSnapshot keeps non-workflow sessions idle", () => {
  const session = createSessionRecord({
    stage: null,
    sessionKind: null,
  });
  const snapshot = createInitialSnapshot(
    session,
    new Map<ProviderStackId, string>([["codexCli", "Codex"]]),
    null
  );

  assert.equal(snapshot.status.connectionState, "idle");
});
