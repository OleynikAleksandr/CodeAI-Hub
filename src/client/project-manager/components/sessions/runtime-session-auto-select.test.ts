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
const WORKSPACE_TREE_AUTO_SELECT_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree-auto-select.ts"
);

test("runtime auto-select no longer contains reviewer auto-focus resolver", async () => {
  const source = await readFile(AUTO_SELECT_SOURCE_PATH, "utf8");

  assert.equal(source.includes("resolveReviewerAutoFocusSessionId"), false);
  assert.equal(
    source.includes("return resolveMostRecentSessionId(visibleSessions);"),
    true,
    "visible sessions must now use plain most-recent selection"
  );
});

test("runtime session view does not import reviewer auto-focus path", async () => {
  const source = await readFile(RUNTIME_VIEW_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("resolveReviewerAutoFocusSessionId"),
    false,
    "runtime view must not consume reviewer auto-focus resolver"
  );
  assert.equal(
    source.includes("useReviewerSessionVisibility"),
    false,
    "runtime view must not use reviewer visibility hook"
  );
  assert.equal(
    source.includes("setActiveSessionId(resolveMostRecentVisibleSessionId(visibleSessions));"),
    true,
    "runtime view must keep most-recent fallback when active session is missing"
  );
});

test("workspace tree auto-select keeps description-first startup routing on shared stage sync payload", async () => {
  const source = await readFile(WORKSPACE_TREE_AUTO_SELECT_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('const STARTUP_STAGE = "description";'),
    true
  );
  assert.equal(
    source.includes('state.lastActive?.stage ?? "description"'),
    false
  );
  assert.equal(source.includes("resolveStageSyncPayload({"), true);
  assert.equal(source.includes("resolveLatestContinuityChain"), false);
});
