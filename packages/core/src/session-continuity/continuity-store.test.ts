import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ContinuityChainStore, readContinuityChains } from "./continuity-store";

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

test("ContinuityChainStore persists development tree node chains under nested node paths", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "development-tree-chain-")
  );
  const stage =
    "development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller";
  const store = new ContinuityChainStore({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
    rootSessionId: "codex-root-development-node",
    stage,
    clock: () => "2026-05-05T06:20:00.000Z",
  });

  const chain = await store.appendSegment({
    sessionId: "session-1",
    providerId: "codexCli",
    providerSessionId: "provider-session-1",
    createdAt: "2026-05-05T06:19:00.000Z",
  });

  const chainPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "demo-workspace",
    "continuity",
    "development_tree",
    "materialized",
    "product-parts",
    "project-manager",
    "clusters",
    "workflow-and-artifact-ui",
    "modules",
    "workflow-step-controller",
    "codex-root-development-node",
    "chain.json"
  );

  assert.equal(chain.stage, stage);
  assert.equal(existsSync(chainPath), true);
  assert.equal(
    existsSync(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        "demo-workspace",
        "continuity",
        "unknown",
        "codex-root-development-node",
        "chain.json"
      )
    ),
    false
  );

  const chains = await readContinuityChains({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
  });
  assert.deepEqual(
    chains.map((item) => item.stage),
    [stage]
  );
});

test("ContinuityChainStore persists technical root workflow chains under canonical stage paths", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "technical-root-chain-")
  );
  const stages = ["application_skeleton", "quality_gates"] as const;

  for (const stage of stages) {
    const rootSessionId = `codex-root-${stage}`;
    const store = new ContinuityChainStore({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
      rootSessionId,
      stage,
      clock: () => "2026-05-06T12:58:00.000Z",
    });

    const chain = await store.appendSegment({
      sessionId: `${rootSessionId}-session-1`,
      providerId: "codexCli",
      providerSessionId: `${rootSessionId}-provider-1`,
      createdAt: "2026-05-06T12:57:00.000Z",
    });

    const chainPath = path.join(
      workspaceRoot,
      ".codeai-hub",
      "demo-workspace",
      "continuity",
      stage,
      rootSessionId,
      "chain.json"
    );
    assert.equal(chain.stage, stage);
    assert.equal(existsSync(chainPath), true);
    assert.equal(
      existsSync(
        path.join(
          workspaceRoot,
          ".codeai-hub",
          "demo-workspace",
          "continuity",
          "unknown",
          rootSessionId,
          "chain.json"
        )
      ),
      false
    );

    const saved = JSON.parse(await readFile(chainPath, "utf8")) as {
      readonly stage: string;
      readonly rootSessionId: string;
    };
    assert.equal(saved.stage, stage);
    assert.equal(saved.rootSessionId, rootSessionId);
  }
});
