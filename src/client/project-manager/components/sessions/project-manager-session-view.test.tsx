import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/project-manager-session-view.tsx"
);
const RUNTIME_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx"
);

test("project-manager-session-view keeps cross-workspace session-created focus guard", async () => {
  const source = await readFile(RUNTIME_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes(
      "const isInScope = Boolean(workspacePath) && session.workspacePath === workspacePath;"
    ),
    true
  );
  assert.equal(
    source.includes(
      "const scopedActiveSessionId = isPreferredPending || visibleSessions.some((session) => session.id === activeSessionId) ? activeSessionId : null;"
    ),
    true
  );
  assert.equal(
    source.includes(
      "const handleSendMessage = useSessionMessageSender(\n    sessionsRef,\n    workspacePath,\n    reload\n  );"
    ),
    true
  );
});

test("project-manager-runtime-session-view keeps runtime and settings model sync hooks together", async () => {
  const source = await readFile(RUNTIME_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("useSettingsModelsSync(sessions, settings, setSnapshots);"),
    true
  );
  assert.equal(
    source.includes("useRuntimeModelSync(activeSessionId, setSnapshots);"),
    true
  );
});

test("project-manager-session-view restores dialog mode only from live PM intents", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("window.localStorage"), false);
  assert.equal(source.includes("loadLastDialogIntent"), false);
  assert.equal(source.includes("saveLastDialogIntent"), false);
  assert.equal(source.includes('setViewMode("runtime");'), true);
  assert.equal(source.includes('startupStage="description"'), true);
});

test("project-manager-runtime-session-view does not seed empty state from browser-local dialog cache", async () => {
  const source = await readFile(RUNTIME_SOURCE_PATH, "utf8");

  assert.equal(source.includes("window.localStorage"), false);
  assert.equal(source.includes("loadLastDialogStage"), false);
  assert.equal(source.includes("setSessionScopeStage(startupStage);"), true);
  assert.equal(source.includes("visibleStage: sessionScopeStage"), true);
});

test("project-manager-runtime-session-view keeps session empty-state sync on live PM events only", async () => {
  const source = await readFile(RUNTIME_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('window.addEventListener("pm:dialog:open", handleDialogIntent);'),
    true
  );
  assert.equal(
    source.includes('window.addEventListener("pm:stage:activated", handleStageActivated);'),
    true
  );
  assert.equal(
    source.includes("setSessionScopeStage((current) =>"),
    true
  );
  assert.equal(
    source.includes("setSessionScopeStage(stage);"),
    true
  );
});
