import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const AUTO_SELECT_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/runtime-session-auto-select.ts"
);
const RUNTIME_VIEW_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx"
);

test("reviewer auto-focus is gated to description collector sessions", async () => {
  const source = await readFile(AUTO_SELECT_SOURCE_PATH, "utf8");

  assert.equal(source.includes("resolveReviewerAutoFocusSessionId"), true);
  assert.equal(
    source.includes('activeSession.stage === "description"'),
    true,
    "auto-focus must stay scoped to description stage"
  );
  assert.equal(
    source.includes('activeSession.sessionKind === "collector"'),
    true,
    "auto-focus must not steal focus from non-collector sessions"
  );
});

test("runtime session view applies reviewer auto-focus through active-session owner", async () => {
  const source = await readFile(RUNTIME_VIEW_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("resolveReviewerAutoFocusSessionId"),
    true,
    "runtime view must consume reviewer auto-focus resolver"
  );
  assert.equal(
    source.includes("setActiveSessionId((current) =>"),
    true,
    "runtime view must update active session through owner state"
  );
});
