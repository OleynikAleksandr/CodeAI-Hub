import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ContinuityChainStore, readContinuityChains } from "./continuity-store";
import type { ContinuityChain } from "./continuity-types";

const buildChainPath = (params: {
  readonly rootSessionId: string;
  readonly stage: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    params.workspaceRoot,
    ".codeai-hub",
    params.workspaceSlug,
    "continuity",
    ...params.stage.split("/"),
    params.rootSessionId,
    "chain.json"
  );

const buildChain = (params: {
  readonly providerSessionId: string;
  readonly rootSessionId: string;
  readonly sessionId: string;
  readonly stage: ContinuityChain["stage"];
  readonly updatedAt: string;
  readonly workspaceSlug: string;
}): ContinuityChain => ({
  rootSessionId: params.rootSessionId,
  dialogId: params.rootSessionId,
  workspaceSlug: params.workspaceSlug,
  stage: params.stage,
  segments: [
    {
      sessionId: params.sessionId,
      providerId: "codexCli",
      providerSessionId: params.providerSessionId,
      createdAt: params.updatedAt,
    },
  ],
  updatedAt: params.updatedAt,
});

const writeCorruptChain = async (
  chainPath: string,
  chain: ContinuityChain
): Promise<void> => {
  await mkdir(path.dirname(chainPath), { recursive: true });
  await writeFile(
    chainPath,
    `${JSON.stringify(chain, null, 2)}\n${chain.rootSessionId}-trailing-corrupt`,
    "utf8"
  );
};

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

test("readContinuityChains recovers trailing-corrupt chains for every workflow stage family", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "continuity-corrupt-read-")
  );
  const workspaceSlug = "demo-workspace";
  const stages = [
    "description",
    "virtual_simulation",
    "diagram_modules",
    "application_skeleton",
    "quality_gates",
    "development_tree/materialized/product-parts/project-manager/modules/settings",
  ] as const;

  for (const [index, stage] of stages.entries()) {
    const rootSessionId = `root-${index}`;
    const chain = buildChain({
      providerSessionId: `provider-${index}`,
      rootSessionId,
      sessionId: `session-${index}`,
      stage,
      updatedAt: `2026-05-13T18:0${index}:00.000Z`,
      workspaceSlug,
    });
    await writeCorruptChain(
      buildChainPath({ rootSessionId, stage, workspaceRoot, workspaceSlug }),
      chain
    );
  }

  const chains = await readContinuityChains({ workspaceRoot, workspaceSlug });
  assert.equal(chains.length, stages.length);
  assert.deepEqual(
    new Set(chains.map((chain) => chain.stage)),
    new Set(stages)
  );
  assert.equal(
    chains.every((chain) => chain.segments.length === 1),
    true
  );
});

test("ContinuityChainStore rewrites recovered corrupt chains as valid JSON", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "continuity-corrupt-rewrite-")
  );
  const workspaceSlug = "demo-workspace";
  const rootSessionId = "claude-root-application-skeleton";
  const stage = "application_skeleton";
  const chainPath = buildChainPath({
    rootSessionId,
    stage,
    workspaceRoot,
    workspaceSlug,
  });
  await writeCorruptChain(
    chainPath,
    buildChain({
      providerSessionId: "provider-session-1",
      rootSessionId,
      sessionId: "session-1",
      stage,
      updatedAt: "2026-05-13T18:04:52.000Z",
      workspaceSlug,
    })
  );

  const store = new ContinuityChainStore({
    workspaceRoot,
    workspaceSlug,
    rootSessionId,
    stage,
    clock: () => "2026-05-13T18:30:00.000Z",
  });
  await store.appendSegment({
    sessionId: "session-2",
    providerId: "claudeCodeCli",
    providerSessionId: "provider-session-2",
    createdAt: "2026-05-13T18:30:00.000Z",
  });

  const saved = JSON.parse(
    await readFile(chainPath, "utf8")
  ) as ContinuityChain;
  assert.equal(saved.rootSessionId, rootSessionId);
  assert.equal(saved.stage, stage);
  assert.equal(saved.segments.length, 2);

  const chainDirEntries = await readdir(path.dirname(chainPath));
  assert.equal(
    chainDirEntries.some((entry) => entry.endsWith(".tmp")),
    false
  );
});

test("ContinuityChainStore serializes concurrent saves as parseable JSON", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "continuity-concurrent-write-")
  );
  const workspaceSlug = "demo-workspace";
  const rootSessionId = "root-quality-gates";
  const stage = "quality_gates";
  const store = new ContinuityChainStore({
    workspaceRoot,
    workspaceSlug,
    rootSessionId,
    stage,
    clock: () => "2026-05-13T19:00:00.000Z",
  });

  await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      store.save(
        buildChain({
          providerSessionId: `provider-session-${index}`,
          rootSessionId,
          sessionId: `session-${index}`,
          stage,
          updatedAt: `2026-05-13T19:00:0${index}.000Z`,
          workspaceSlug,
        })
      )
    )
  );

  const chainPath = buildChainPath({
    rootSessionId,
    stage,
    workspaceRoot,
    workspaceSlug,
  });
  const saved = JSON.parse(
    await readFile(chainPath, "utf8")
  ) as ContinuityChain;
  assert.equal(saved.rootSessionId, rootSessionId);
  assert.equal(saved.stage, stage);
});
