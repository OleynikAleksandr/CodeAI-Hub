import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/project-manager-session-view.tsx"
);

test("project-manager-session-view keeps cross-workspace session-created focus guard", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes(
      "const isInScope = Boolean(workspacePath) && session.workspacePath === workspacePath;"
    ),
    true
  );
  assert.equal(
    source.includes(
      "const scopedActiveSessionId =\n    visibleSessions.some((session) => session.id === activeSessionId) ? activeSessionId : null;"
    ),
    true
  );
  assert.equal(
    source.includes("const handleSendMessage = useSessionMessageSender(sessionsRef, workspacePath);"),
    true
  );
});
