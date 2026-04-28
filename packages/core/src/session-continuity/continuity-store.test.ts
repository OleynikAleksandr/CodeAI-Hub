import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ContinuityChainStore } from "./continuity-store";

test("ContinuityChainStore persists diagram modules chains under the canonical stage path", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "diagram-modules-chain-")
  );
  const store = new ContinuityChainStore({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
    rootSessionId: "root-session",
    stage: "diagram_modules",
    clock: () => "2026-04-05T12:40:00.000Z",
  });

  const chain = await store.appendSegment({
    sessionId: "session-1",
    providerId: "claude-code",
    providerSessionId: "provider-session-1",
    modelBinding: {
      key: "provider\u001fcodexCli\u001fsession\u001froot-session",
      providerId: "codexCli",
      baseModelId: "gpt-5.3-codex-spark",
      modelId: "gpt-5.3-codex-spark reasoning:xhigh",
      reasoningEffort: "xhigh",
      source: "settings_default",
      boundAt: "2026-04-05T12:39:00.000Z",
      updatedAt: "2026-04-05T12:39:00.000Z",
    },
    createdAt: "2026-04-05T12:39:00.000Z",
  });

  const chainPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "demo-workspace",
    "continuity",
    "diagram_modules",
    "root-session",
    "chain.json"
  );

  assert.equal(chain.stage, "diagram_modules");
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
    readonly segments: readonly {
      readonly modelBinding?: { readonly modelId?: string };
    }[];
  };
  assert.equal(saved.stage, "diagram_modules");
  assert.equal(saved.rootSessionId, "root-session");
  assert.equal(
    saved.segments[0]?.modelBinding?.modelId,
    "gpt-5.3-codex-spark reasoning:xhigh"
  );
});
