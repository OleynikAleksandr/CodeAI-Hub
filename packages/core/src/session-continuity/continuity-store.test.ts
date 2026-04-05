import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ContinuityChainStore } from "./continuity-store";

test("ContinuityChainStore persists foundation envelope chains under the canonical stage path", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "foundation-envelope-chain-")
  );
  const store = new ContinuityChainStore({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
    rootSessionId: "root-session",
    stage: "foundation_envelope",
    clock: () => "2026-04-05T12:40:00.000Z",
  });

  const chain = await store.appendSegment({
    sessionId: "session-1",
    providerId: "claude-code",
    providerSessionId: "provider-session-1",
    createdAt: "2026-04-05T12:39:00.000Z",
  });

  const chainPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "demo-workspace",
    "continuity",
    "foundation_envelope",
    "root-session",
    "chain.json"
  );

  assert.equal(chain.stage, "foundation_envelope");
  assert.equal(existsSync(chainPath), true);
  assert.equal(
    existsSync(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        "demo-workspace",
        "continuity",
        "unknown",
        "root-session",
        "chain.json"
      )
    ),
    false
  );

  const saved = JSON.parse(await readFile(chainPath, "utf8")) as {
    readonly stage: string;
    readonly rootSessionId: string;
  };
  assert.equal(saved.stage, "foundation_envelope");
  assert.equal(saved.rootSessionId, "root-session");
});
