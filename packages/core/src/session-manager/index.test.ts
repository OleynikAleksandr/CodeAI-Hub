import assert from "node:assert/strict";
import test from "node:test";
import { SessionManager } from "./index";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("SessionManager createSession generates uuid ids", () => {
  const manager = new SessionManager();

  const first = manager.createSession("codexCli", "/tmp/workspace-a");
  const second = manager.createSession("codexCli", "/tmp/workspace-a");

  assert.match(first.id, UUID_V4_PATTERN);
  assert.match(second.id, UUID_V4_PATTERN);
  assert.notEqual(first.id, second.id);
});

test("SessionManager getSessionsByWorkspacePath returns scoped sessions", () => {
  const manager = new SessionManager();

  const workspaceA = "/tmp/workspace-a";
  const workspaceB = "/tmp/workspace-b";

  const first = manager.createSession("codexCli", workspaceA);
  const second = manager.createSession("codexCli", workspaceB);
  const third = manager.createSession("codexCli", workspaceA);

  const scoped = manager.getSessionsByWorkspacePath(workspaceA);

  assert.deepEqual(
    scoped.map((session) => session.id),
    [first.id, third.id]
  );
  assert.equal(
    scoped.some((session) => session.id === second.id),
    false
  );
});
