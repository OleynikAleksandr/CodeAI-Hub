import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDevelopmentOrderUnlockStatePath } from "../product-part-workflow/development-order-plan-unlock-state";
import { ClusterContractAgentBootstrapper } from "./cluster-contract-agent-bootstrapper";

const WORKSPACE_SLUG = "demo-workspace";
const PART_ID = "finder-widget";
const CLUSTER_ID = "note-selection-cluster";

const writeUnlockState = async (workspaceRoot: string): Promise<void> => {
  const relativePath = createDevelopmentOrderUnlockStatePath({
    partId: PART_ID,
    workspaceSlug: WORKSPACE_SLUG,
  });
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(
    absolutePath,
    `${JSON.stringify(
      {
        acceptedOrderPlanCommitHash: "abc123",
        firstWaveId: "wave-1",
        firstWaveUnlockNodeIds: [`cluster:${PART_ID}/${CLUSTER_ID}`],
        nodes: [
          {
            clusterId: CLUSTER_ID,
            id: `cluster:${PART_ID}/${CLUSTER_ID}`,
            kind: "cluster",
            partId: PART_ID,
            status: "unlocked",
          },
          {
            clusterId: CLUSTER_ID,
            id: `module:${PART_ID}/${CLUSTER_ID}/latest-note-resolver`,
            kind: "module",
            partId: PART_ID,
            status: "locked",
          },
        ],
        partId: PART_ID,
        schema: "codeai-development-order-unlock-state-v1",
        updatedAt: "2026-06-08T00:00:00.000Z",
        workspaceSlug: WORKSPACE_SLUG,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
};

test("ClusterContractAgentBootstrapper opens only unlocked cluster contract sessions", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "cluster-contract-bootstrap-")
  );
  try {
    await writeUnlockState(workspaceRoot);
    const planCommits: {
      readonly commitMessage: string;
      readonly paths: readonly string[];
      readonly workspaceRoot: string;
    }[] = [];
    const createdSessions: {
      readonly stage: string;
      readonly workspacePath: string;
    }[] = [];
    const bootstrapper = new ClusterContractAgentBootstrapper(
      {
        gateway: {
          createSessionForWorkflow: (options) => {
            createdSessions.push({
              stage: options.context.stage,
              workspacePath: options.workspacePath,
            });
            return Promise.resolve({ id: "cluster-session-1" });
          },
        },
        providerId: "codex",
      },
      {
        planCommitter: {
          commit: (request) => {
            planCommits.push(request);
            return Promise.resolve({});
          },
        },
        planWriter: {
          writePlan: (request) =>
            Promise.resolve({
              absolutePath: `${request.worktreeRoot}/todo-plan.md`,
              action: "created",
              relativePath: "todo-plan.md",
            }),
        },
        worktreeCreator: {
          createClusterContractWorktree: (request) =>
            Promise.resolve({
              branchName: `codex/${request.partId}/${request.clusterId}`,
              nodeId: `cluster:${request.partId}/${request.clusterId}`,
              worktreePath: `${workspaceRoot}.worktrees/${request.clusterId}`,
            }),
        },
      }
    );

    const results = await bootstrapper.bootstrapFirstWave({
      inheritedModelBinding: {
        boundAt: "2026-06-08T00:00:00.000Z",
        key: "lead-binding",
        modelId: "gpt-5.4-mini",
        providerId: "codex",
        reasoningEffort: "medium",
        source: "continuity_inherited",
        updatedAt: "2026-06-08T00:00:00.000Z",
      },
      partId: PART_ID,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(results.length, 1);
    assert.equal(results[0]?.clusterId, CLUSTER_ID);
    assert.equal(results[0]?.sessionId, "cluster-session-1");
    assert.deepEqual(planCommits, [
      {
        commitMessage: `chore: initialize ${CLUSTER_ID} cluster contract workflow`,
        paths: ["todo-plan.md"],
        workspaceRoot: `${workspaceRoot}.worktrees/${CLUSTER_ID}`,
      },
    ]);
    assert.deepEqual(createdSessions, [
      {
        stage: `development_tree/materialized/product-parts/${PART_ID}/clusters/${CLUSTER_ID}`,
        workspacePath: `${workspaceRoot}.worktrees/${CLUSTER_ID}`,
      },
    ]);
    const persistedState = JSON.parse(
      await readFile(
        path.join(
          workspaceRoot,
          createDevelopmentOrderUnlockStatePath({
            partId: PART_ID,
            workspaceSlug: WORKSPACE_SLUG,
          })
        ),
        "utf8"
      )
    ) as {
      readonly nodes: readonly {
        readonly branchName?: string;
        readonly clusterId?: string;
        readonly modelBinding?: { readonly modelId?: string };
        readonly sessionId?: string;
        readonly sessionStage?: string;
        readonly worktreePath?: string;
      }[];
    };
    const clusterNode = persistedState.nodes.find(
      (node) => node.clusterId === CLUSTER_ID
    );
    assert.equal(clusterNode?.branchName, `codex/${PART_ID}/${CLUSTER_ID}`);
    assert.equal(clusterNode?.modelBinding?.modelId, "gpt-5.4-mini");
    assert.equal(clusterNode?.sessionId, "cluster-session-1");
    assert.equal(
      clusterNode?.sessionStage,
      `development_tree/materialized/product-parts/${PART_ID}/clusters/${CLUSTER_ID}`
    );
    assert.equal(
      clusterNode?.worktreePath,
      `${workspaceRoot}.worktrees/${CLUSTER_ID}`
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
