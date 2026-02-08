import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/reviewer-session-visibility.ts"
);
const SESSION_VIEW_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/project-manager-session-view.tsx"
);

test("reviewer-session-visibility keeps deterministic reopen/resume matching within selected workspace", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("session.workspacePath === params.workspacePath &&"),
    true,
    "reviewer candidate resolution must stay scoped to selected workspace"
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
    source.includes("terminalNoResume"),
    true,
    "terminal no-resume marker must stay in visibility snapshot contract"
  );
  assert.equal(
    source.includes("hideTerminalCollectors"),
    true,
    "terminal collector sessions must be excluded from focus path"
  );
  assert.equal(
    source.includes("params.reviewerSessionId === null"),
    true,
    "terminal collector hiding must be enabled only when no reviewer session is resolved"
  );
});

test("project-manager-session-view applies workspace snapshot lock state during handoff", async () => {
  const source = await readFile(SESSION_VIEW_SOURCE_PATH, "utf8");

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
});
