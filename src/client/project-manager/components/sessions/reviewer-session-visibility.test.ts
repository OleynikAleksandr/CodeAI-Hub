import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/reviewer-session-visibility.ts"
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
});
