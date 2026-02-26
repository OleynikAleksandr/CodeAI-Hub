import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/reviewer-session-visibility.ts"
);
const RUNTIME_SESSION_VIEW_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx"
);

test("reviewer-session-visibility keeps deterministic reopen/resume matching within selected workspace", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("session.workspacePath === params.workspacePath &&"),
    true,
    "reviewer candidate resolution must stay scoped to selected workspace"
  );
  assert.equal(
    source.includes('session.sessionKind === "reviewer"'),
    true,
    "reviewer resolution must prefer explicit reviewer sessionKind"
  );
  assert.equal(
    source.includes('session.runSlug === "reviewer"'),
    true,
    "reviewer resolution must prefer explicit reviewer runSlug"
  );
  assert.equal(
    source.includes(
      "session.binding.providerSessionId === providerSessionId"
    ),
    true,
    "reopen path must prefer exact providerSessionId match"
  );
  assert.equal(
    source.includes(
      "matched = candidates.reduce((latest, session) =>\n      session.createdAt > latest.createdAt ? session : latest"
    ),
    true,
    "fallback must deterministically pick latest description session"
  );
  assert.equal(
    source.includes("!params.workspacePath || !params.reviewerSessionId"),
    true,
    "description sessions must not be force-hidden before reviewer session is resolved"
  );
});

test("project-manager-runtime-session-view applies workspace snapshot lock state during handoff", async () => {
  const source = await readFile(RUNTIME_SESSION_VIEW_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("workspaceSnapshotStore.applySnapshot(payload);"),
    true,
    "workspace snapshot payload must be committed to store before UI lock resolution"
  );
  assert.equal(
    source.includes("applyWorkspaceSnapshotToSnapshots(previous, payload)"),
    true,
    "workspace snapshot must remain authoritative when applying lock state"
  );
  assert.equal(
    source.includes("workspaceSnapshotStore.getState()"),
    true,
    "hydration must reapply latest stored workspace snapshot to avoid stale default running lock"
  );
});
