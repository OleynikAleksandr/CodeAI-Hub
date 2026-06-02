import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DevelopmentTreeStateFacade } from "./development-tree-state-facade";

const PART_CONTENT = `# Product Part: Project Manager

## Identity

| Field | Value |
| ----- | ----- |
| Part ID | \`project-manager\` |

## Owned Clusters

### \`workflow-and-artifact-ui\`

| \`module-id\` | Responsibility |
| --- | --- |
| \`workflow-step-controller\` | Controls workflow steps. |

## Standalone Modules
`;

const CORE_PART_CONTENT = `# Product Part: Core Runtime

## Identity

| Field | Value |
| ----- | ----- |
| Part ID | \`core-runtime\` |

## Owned Clusters

### \`contract-orchestration\`

| \`module-id\` | Responsibility |
| --- | --- |
| \`contract-graph-service\` | Owns contract graph state. |

## Standalone Modules
`;

const createDraft = (body: string): string => `---
generated: true
---

## Draft

<!-- agent-fill -->
${body}
<!-- /agent-fill -->
`;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

test("DevelopmentTreeStateFacade exposes draft artifacts and sessions per node", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-metadata-")
  );
  const workspaceSlug = "demo-workspace";
  const moduleWorkflowPath =
    "development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller";
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/project-manager.md`,
      PART_CONTENT
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/${moduleWorkflowPath}/ModuleSpec.draft.md`,
      "# Module Spec\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/continuity/${moduleWorkflowPath}/codex-root/chain.json`,
      `${JSON.stringify(
        {
          rootSessionId: "codex-root",
          dialogId:
            "codex-root-project-manager-workflow-and-artifact-ui-workflow-step-controller",
          workspaceSlug,
          stage: moduleWorkflowPath,
          segments: [
            {
              sessionId: "runtime-session",
              providerId: "codexCli",
              providerSessionId: "provider-session",
              createdAt: "2026-05-05T07:00:00.000Z",
            },
          ],
          updatedAt: "2026-05-05T07:01:00.000Z",
        },
        null,
        2
      )}\n`
    );

    const snapshot = await new DevelopmentTreeStateFacade().currentSnapshot({
      workspaceRoot,
      workspaceSlug,
      plannedPartIds: ["project-manager"],
      generatedPartIds: ["project-manager"],
    });
    const module = snapshot.parts[0]?.clusters[0]?.modules[0];

    assert.equal(module?.workflowPath, moduleWorkflowPath);
    assert.equal(
      module?.artifactWorkspacePath,
      `.codeai-hub/${workspaceSlug}/${moduleWorkflowPath}`
    );
    assert.deepEqual(module?.operations, []);
    assert.deepEqual(module?.artifacts, [
      {
        fileName: "ModuleSpec.draft.md",
        path: `.codeai-hub/${workspaceSlug}/${moduleWorkflowPath}/ModuleSpec.draft.md`,
      },
    ]);
    assert.equal(module?.session?.providerId, "codexCli");
    assert.equal(module?.session?.sessionId, "runtime-session");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeStateFacade refreshes readiness after draft writes", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-readiness-refresh-")
  );
  const workspaceSlug = "demo-workspace";
  const partRoot =
    ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/project-manager";
  const clusterRoot = `${partRoot}/clusters/workflow-and-artifact-ui`;
  const moduleRoot = `${clusterRoot}/modules/workflow-step-controller`;
  const sentinel =
    "_CODEAI_AGENT_FILL_SENTINEL: replace this line with draft content._";
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/project-manager.md`,
      PART_CONTENT
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `${partRoot}/PartDescription.draft.md`,
      createDraft(sentinel)
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `${clusterRoot}/ClusterDescription.draft.md`,
      createDraft(sentinel)
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `${clusterRoot}/ClusterFacadeContract.draft.md`,
      createDraft(sentinel)
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `${moduleRoot}/ModuleSpec.draft.md`,
      createDraft(sentinel)
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `${moduleRoot}/ModuleFacadeContract.draft.md`,
      createDraft(sentinel)
    );

    const facade = new DevelopmentTreeStateFacade();
    const before = await facade.currentSnapshot({
      workspaceRoot,
      workspaceSlug,
      plannedPartIds: ["project-manager"],
      generatedPartIds: ["project-manager"],
    });
    assert.equal(before.parts[0]?.readiness, "idle");
    assert.equal(before.parts[0]?.clusters[0]?.readiness, "idle");
    assert.equal(before.parts[0]?.clusters[0]?.modules[0]?.readiness, "idle");

    await writeWorkspaceFile(
      workspaceRoot,
      `${partRoot}/PartDescription.draft.md`,
      createDraft("Project Manager part draft is filled.")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `${clusterRoot}/ClusterDescription.draft.md`,
      createDraft("Workflow and artifact UI cluster draft is filled.")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `${clusterRoot}/ClusterFacadeContract.draft.md`,
      createDraft("Cluster facade contract draft is filled.")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `${moduleRoot}/ModuleSpec.draft.md`,
      createDraft("Workflow step controller module spec is filled.")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `${moduleRoot}/ModuleFacadeContract.draft.md`,
      createDraft("Workflow step controller facade contract is filled.")
    );

    const after = await facade.currentSnapshot({
      workspaceRoot,
      workspaceSlug,
      plannedPartIds: ["project-manager"],
      generatedPartIds: ["project-manager"],
    });
    assert.equal(after.parts[0]?.readiness, "ready");
    assert.equal(after.parts[0]?.clusters[0]?.readiness, "ready");
    assert.equal(after.parts[0]?.clusters[0]?.modules[0]?.readiness, "ready");
    assert.deepEqual(
      after.parts[0]?.clusters[0]?.modules[0]?.artifacts?.map(
        (artifact) => artifact.fileName
      ),
      ["ModuleSpec.draft.md", "ModuleFacadeContract.draft.md"]
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeStateFacade applies leadership order and locks non-lead nodes", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-leadership-")
  );
  const workspaceSlug = "demo-workspace";
  const lockedReason = "Lead Product Part contract graph is pending";
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/project-manager.md`,
      PART_CONTENT
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/core-runtime.md`,
      CORE_PART_CONTENT
    );

    const snapshot = await new DevelopmentTreeStateFacade().currentSnapshot({
      workspaceRoot,
      workspaceSlug,
      plannedPartIds: ["project-manager", "core-runtime"],
      generatedPartIds: ["project-manager", "core-runtime"],
      leadProductPartId: "core-runtime",
      productPartLeadershipOrder: ["core-runtime", "project-manager"],
    });
    const leadPart = snapshot.parts[0];
    const followerPart = snapshot.parts[1];

    assert.equal(snapshot.leadProductPartId, "core-runtime");
    assert.deepEqual(snapshot.productPartLeadershipOrder, [
      "core-runtime",
      "project-manager",
    ]);
    assert.deepEqual(
      snapshot.parts.map((part) => part.id),
      ["core-runtime", "project-manager"]
    );
    const leadOperation = (
      leadPart as {
        readonly operations?: readonly {
          readonly children?: readonly { readonly id: string }[];
          readonly id: string;
          readonly kind: string;
          readonly workflowPath: string;
        }[];
      }
    )?.operations?.[0];
    assert.equal(leadOperation?.id, "lead-product-part-orchestration");
    assert.equal(leadOperation?.kind, "lead_orchestration");
    assert.equal(
      leadOperation?.workflowPath,
      "development_tree/materialized/product-parts/core-runtime/lead-product-part-orchestration"
    );
    assert.deepEqual(
      leadOperation?.children?.map((child) => child.id),
      [
        "contract-graph",
        "cross-part-contracts",
        "shared-interfaces",
        "execution-waves",
      ]
    );
    assert.equal(leadPart?.lifecycle?.startable, true);
    assert.equal(leadPart?.lifecycle?.lockedReason, undefined);
    assert.equal(followerPart?.lifecycle?.startable, false);
    assert.equal(followerPart?.lifecycle?.lockedReason, lockedReason);
    assert.equal(
      followerPart?.clusters[0]?.modules[0]?.lifecycle?.lockedReason,
      lockedReason
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeStateFacade does not emit materialization side effects during read-only snapshots", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-side-effects-")
  );
  const workspaceSlug = "demo-workspace";
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/project-manager.md`,
      PART_CONTENT
    );
    const facade = new DevelopmentTreeStateFacade();
    let calls = 0;
    facade.subscribeSnapshot(() => {
      calls += 1;
    });

    await facade.currentSnapshot({
      workspaceRoot,
      workspaceSlug,
      plannedPartIds: ["project-manager"],
      generatedPartIds: ["project-manager"],
    });
    assert.equal(calls, 0);

    await facade.currentSnapshot({
      workspaceRoot,
      workspaceSlug,
      plannedPartIds: ["project-manager"],
      generatedPartIds: ["project-manager"],
      emitSnapshotSideEffects: true,
    });
    assert.equal(calls, 1);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
