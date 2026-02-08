import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/session-stream.ts"
);

test("session-stream remains a transport layer for session events", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes('if (message.type === "session:created")'), true);
  assert.equal(source.includes("params.onSessionCreated(normalized);"), true);
  assert.equal(source.includes('if (message.type === "session:stream")'), true);
  assert.equal(source.includes('if (message.type === "workspace:snapshot")'), true);
  assert.equal(source.includes("params.onWorkspaceSnapshot?.(payload);"), true);
  assert.equal(source.includes("turn_state"), false);
  assert.equal(source.includes("continuity_lock"), false);
  assert.equal(source.includes("setActiveSessionId"), false);
});
