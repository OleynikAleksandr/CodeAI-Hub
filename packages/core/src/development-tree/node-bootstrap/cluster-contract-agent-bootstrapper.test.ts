import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createDevelopmentOrderUnlockState,
  createDevelopmentOrderUnlockStatePath,
} from "../product-part-workflow/development-order-plan-unlock-state";
import { ClusterContractAgentBootstrapper } from "./cluster-contract-agent-bootstrapper";

const WORKSPACE_SLUG = "demo-workspace";
const PART_ID = "finder-widget";
const CLUSTER_ID = "note-selection-cluster";
const RUSSIAN_CHAT_LANGUAGE_RE = /Chat language code: `ru`/u;
const RUSSIAN_ARTIFACT_LANGUAGE_RE = /Artifact prose language code: `ru`/u;
const RUSSIAN_LOCALIZED_INSTRUCTION_RE =
  /Общайся с пользователем на языке `ru`/u;

const writeGlobalLocalizationSettings = async (
  workspaceRoot: string
): Promise<string> => {
  const settingsPath = path.join(workspaceRoot, "global", "settings.json");
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(
    settingsPath,
    `${JSON.stringify(
      {
        general: {
          localization: {
            categories: {
              artifactsForTheUser: "ru",
              messagesForTheUser: "ru",
              reasoning: "ru",
              systemFeedback: "ru",
            },
            defaultLanguage: "en",
          },
        },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return settingsPath;
};

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
            contractSeed: {
              blockingQuestions: ["snippet policy"],
              consumer: "finder-widget-shell",
              nodeId: `cluster:${PART_ID}/${CLUSTER_ID}`,
              requiredInputs: ["notes folder context"],
              requiredOutputs: ["normalized note payload"],
              requiredOwnedModules: ["latest-note-resolver"],
              requiredStatuses: ["data-found", "no-data", "access-error"],
            },
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
  const previousGlobalSettingsPath = process.env.CODEAI_GLOBAL_SETTINGS_PATH;
  try {
    process.env.CODEAI_GLOBAL_SETTINGS_PATH =
      await writeGlobalLocalizationSettings(workspaceRoot);
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
    const sentPrompts: string[] = [];
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
          handleMessage: (_sessionId, content) => {
            sentPrompts.push(content);
            return Promise.resolve();
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
    assert.equal(results[0]?.firstMessageSent, true);
    assert.equal(results[0]?.sessionId, "cluster-session-1");
    assert.equal(sentPrompts.length, 1);
    assert.match(sentPrompts[0] ?? "", RUSSIAN_CHAT_LANGUAGE_RE);
    assert.match(sentPrompts[0] ?? "", RUSSIAN_ARTIFACT_LANGUAGE_RE);
    assert.match(sentPrompts[0] ?? "", RUSSIAN_LOCALIZED_INSTRUCTION_RE);
    assert.deepEqual(planCommits, [
      {
        commitMessage: `chore: initialize ${CLUSTER_ID} cluster contract workflow`,
        paths: ["todo-plan.md"],
        workspaceRoot: `${workspaceRoot}.worktrees/${CLUSTER_ID}`,
      },
      {
        commitMessage: `chore: record ${CLUSTER_ID} cluster contract session`,
        paths: [
          createDevelopmentOrderUnlockStatePath({
            partId: PART_ID,
            workspaceSlug: WORKSPACE_SLUG,
          }),
        ],
        workspaceRoot,
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
        readonly contractSeed?: { readonly consumer?: string };
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
    assert.equal(clusterNode?.contractSeed?.consumer, "finder-widget-shell");
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
    if (previousGlobalSettingsPath === undefined) {
      process.env.CODEAI_GLOBAL_SETTINGS_PATH = undefined;
    } else {
      process.env.CODEAI_GLOBAL_SETTINGS_PATH = previousGlobalSettingsPath;
    }
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("createDevelopmentOrderUnlockState carries accepted contract seeds", () => {
  const state = createDevelopmentOrderUnlockState({
    acceptedOrderPlanCommitHash: "abc123",
    partId: PART_ID,
    plan: {
      contractSeeds: [
        {
          blockingQuestions: [],
          consumer: "finder-widget-shell",
          nodeId: `cluster:${PART_ID}/${CLUSTER_ID}`,
          requiredInputs: ["notes folder context"],
          requiredOutputs: ["normalized note payload"],
          requiredOwnedModules: ["latest-note-resolver"],
          requiredStatuses: ["data-found", "no-data"],
        },
      ],
      firstWaveId: "wave-1",
      nodes: [
        {
          clusterId: CLUSTER_ID,
          dependsOn: [],
          id: `cluster:${PART_ID}/${CLUSTER_ID}`,
          kind: "cluster",
          partId: PART_ID,
        },
      ],
      waves: [
        {
          id: "wave-1",
          unlockNodeIds: [`cluster:${PART_ID}/${CLUSTER_ID}`],
        },
      ],
    },
    updatedAt: "2026-06-09T00:00:00.000Z",
    workspaceSlug: WORKSPACE_SLUG,
  });
  const clusterNode = state.nodes[0];
  assert.equal(clusterNode?.contractSeed?.consumer, "finder-widget-shell");
  assert.deepEqual(clusterNode?.contractSeed?.requiredOwnedModules, [
    "latest-note-resolver",
  ]);
});
