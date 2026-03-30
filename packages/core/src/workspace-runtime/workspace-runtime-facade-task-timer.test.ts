import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { TaskTimerStorage } from "./task-timer-storage";
import { WorkspaceRuntimeFacade } from "./workspace-runtime-facade";
import type { SessionKey } from "./workspace-runtime-types";

const workspaceA = "/tmp/workspace-a";

test("WorkspaceRuntimeFacade preserves task timer totals across Stop/Play restarts", () => {
  const fakeWorkspaceRoot = mkdtempSync(join(tmpdir(), "codeai-workspace-"));
  const storage = new TaskTimerStorage(fakeWorkspaceRoot);

  const originalNow = Date.now;
  let nowMs = 1_000_000;

  const sessionKey: SessionKey = {
    workspaceRoot: workspaceA,
    nodeId: "reviewer",
    sessionId: "timer-session",
  };

  const storageFactory = (root: string) =>
    root === workspaceA ? storage : new TaskTimerStorage(root);

  try {
    Date.now = () => nowMs;

    const facade = new WorkspaceRuntimeFacade({
      taskTimerStorageFactory: storageFactory,
    });

    facade.notifySessionCreated(sessionKey, {
      providerId: "claudeCodeCli",
      resumeMode: "resume_in_place",
    });
    facade.notifyTurnStateChanged(sessionKey, "running");
    nowMs += 5000;
    facade.dispose();
  } finally {
    Date.now = originalNow;
  }

  try {
    const restoredFacade = new WorkspaceRuntimeFacade({
      taskTimerStorageFactory: storageFactory,
    });

    restoredFacade.select({
      clientId: "client-restore",
      request: {
        requestId: "req-restore",
        workspaceRoot: workspaceA,
        reason: "workspace_selected",
      },
    });
    restoredFacade.notifySessionCreated(sessionKey, {
      providerId: "claudeCodeCli",
      resumeMode: "resume_in_place",
    });

    const snapshot = restoredFacade.getSnapshot(workspaceA);
    const sessionSnapshot = snapshot.sessions[sessionKey.sessionId];
    assert.ok(sessionSnapshot);
    assert.equal(sessionSnapshot.taskTimer?.totalSeconds, 5);

    restoredFacade.dispose();
  } finally {
    rmSync(fakeWorkspaceRoot, { recursive: true, force: true });
  }
});

test("WorkspaceRuntimeFacade restores persisted totals when sessions hydrate before select", () => {
  const fakeWorkspaceRoot = mkdtempSync(join(tmpdir(), "codeai-workspace-"));
  const storage = new TaskTimerStorage(fakeWorkspaceRoot);

  const originalNow = Date.now;
  let nowMs = 2_000_000;

  const sessionKey: SessionKey = {
    workspaceRoot: workspaceA,
    nodeId: "virtual_simulation",
    sessionId: "timer-hydrate-before-select",
  };

  const storageFactory = (root: string) =>
    root === workspaceA ? storage : new TaskTimerStorage(root);

  try {
    Date.now = () => nowMs;

    const facade = new WorkspaceRuntimeFacade({
      taskTimerStorageFactory: storageFactory,
    });
    facade.notifySessionCreated(sessionKey, {
      providerId: "claudeCodeCli",
      resumeMode: "resume_in_place",
    });
    facade.notifyTurnStateChanged(sessionKey, "running");
    nowMs += 5000;
    facade.dispose();
  } finally {
    Date.now = originalNow;
  }

  try {
    const restoredFacade = new WorkspaceRuntimeFacade({
      taskTimerStorageFactory: storageFactory,
    });

    restoredFacade.notifySessionCreated(sessionKey, {
      providerId: "claudeCodeCli",
      resumeMode: "resume_in_place",
    });
    restoredFacade.select({
      clientId: "client-hydrate-before-select",
      request: {
        requestId: "req-hydrate-before-select",
        workspaceRoot: workspaceA,
        reason: "workspace_selected",
      },
    });

    const snapshot = restoredFacade.getSnapshot(workspaceA);
    const sessionSnapshot = snapshot.sessions[sessionKey.sessionId];
    assert.ok(sessionSnapshot);
    assert.equal(sessionSnapshot.taskTimer?.totalSeconds, 5);

    restoredFacade.dispose();
  } finally {
    rmSync(fakeWorkspaceRoot, { recursive: true, force: true });
  }
});
