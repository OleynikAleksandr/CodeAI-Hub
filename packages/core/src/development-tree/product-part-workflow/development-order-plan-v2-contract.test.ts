import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateDevelopmentOrderPlanV2 } from "./development-order-plan-v2-contract";

const WORKSPACE_SLUG = "demo-workspace";
const LEAD_PART_ID = "finder-widget";
const MODULE_FIRST_WAVE_RE = /may unlock only cluster or standalone_module/u;
const MISSING_MATERIALIZED_NODE_RE =
  /does not exist in materialized Development Tree/u;
const MISSING_CONTRACT_SEEDS_RE = /contractSeeds must define/u;
const INCOMPLETE_CONTRACT_SEED_RE =
  /must include consumer, requiredInputs, and requiredOutputs/u;
const REQUIRED_OWNED_MODULES_RE = /requiredOwnedModules/u;

const createWorkspace = async (): Promise<string> => {
  const root = await mkdtemp(path.join(os.tmpdir(), "order-plan-v2-"));
  await mkdir(
    path.join(
      root,
      ".codeai-hub",
      WORKSPACE_SLUG,
      "development_tree",
      "materialized",
      "product-parts",
      LEAD_PART_ID,
      "clusters",
      "note-selection-cluster",
      "modules",
      "latest-note-resolver"
    ),
    { recursive: true }
  );
  await mkdir(
    path.join(
      root,
      ".codeai-hub",
      WORKSPACE_SLUG,
      "development_tree",
      "materialized",
      "product-parts",
      LEAD_PART_ID,
      "modules",
      "empty-state-resolver"
    ),
    { recursive: true }
  );
  return root;
};

const createValidPlan = (): Record<string, unknown> => ({
  schema: "codeai-development-order-plan-v2",
  leadProductPartId: LEAD_PART_ID,
  productPartLeadershipOrder: [LEAD_PART_ID, "finder-widget-shell"],
  requiredBriefs: [
    {
      partId: LEAD_PART_ID,
      status: "accepted",
    },
  ],
  nodes: [
    {
      id: "cluster:finder-widget/note-selection-cluster",
      kind: "cluster",
      partId: LEAD_PART_ID,
      clusterId: "note-selection-cluster",
      dependsOn: [],
      execution: {
        mode: "subagent-worktree",
        startPolicy: "core-unlocks-user-startable",
      },
      expectedArtifacts: [
        "ClusterSpecification.draft.md",
        "ClusterFacadeContract.draft.md",
      ],
    },
    {
      id: "module:finder-widget/note-selection-cluster/latest-note-resolver",
      kind: "module",
      partId: LEAD_PART_ID,
      clusterId: "note-selection-cluster",
      moduleId: "latest-note-resolver",
      dependsOn: ["cluster:finder-widget/note-selection-cluster"],
      execution: {
        mode: "subagent-worktree",
        startPolicy: "locked",
      },
      expectedArtifacts: ["ModuleSpecification.draft.md"],
    },
  ],
  contractSeeds: [
    {
      nodeId: "cluster:finder-widget/note-selection-cluster",
      consumer: "finder-widget-shell",
      requiredInputs: ["local notes folder context"],
      requiredOutputs: ["normalized note-selection result"],
      requiredStatuses: [
        "data-found",
        "no-data",
        "access-error",
        "invalid-input",
      ],
      requiredOwnedModules: ["latest-note-resolver"],
      blockingQuestions: ["snippet policy must be resolved before coding"],
    },
  ],
  waves: [
    {
      id: "wave-1-cluster-contracts",
      unlockNodeIds: ["cluster:finder-widget/note-selection-cluster"],
      parallelGroup: "A",
      gate: "lead_product_part_coordination_review",
    },
  ],
  lockedNodes: [
    {
      nodeId:
        "module:finder-widget/note-selection-cluster/latest-note-resolver",
      reason: "waiting_for_cluster_specification_and_facade_contract",
    },
  ],
});

const validatePlan = async (
  workspaceRoot: string,
  plan: Record<string, unknown>
): ReturnType<typeof validateDevelopmentOrderPlanV2> =>
  validateDevelopmentOrderPlanV2({
    leadProductPartId: LEAD_PART_ID,
    plan,
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });

test("accepts a first-wave cluster unlock plan", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const result = await validatePlan(workspaceRoot, createValidPlan());
    assert.deepEqual(result.diagnostics, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("rejects a first wave that unlocks a module directly", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const plan = createValidPlan();
    plan.waves = [
      {
        id: "wave-1-module",
        unlockNodeIds: [
          "module:finder-widget/note-selection-cluster/latest-note-resolver",
        ],
      },
    ];
    const result = await validatePlan(workspaceRoot, plan);
    assert.match(result.diagnostics.join("\n"), MODULE_FIRST_WAVE_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("rejects node ids that are absent from materialized tree", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const plan = createValidPlan();
    plan.nodes = [
      {
        id: "cluster:finder-widget/missing-cluster",
        kind: "cluster",
        partId: LEAD_PART_ID,
        clusterId: "missing-cluster",
        dependsOn: [],
      },
    ];
    plan.waves = [
      {
        id: "wave-1-missing",
        unlockNodeIds: ["cluster:finder-widget/missing-cluster"],
      },
    ];
    plan.lockedNodes = [];
    const result = await validatePlan(workspaceRoot, plan);
    assert.match(result.diagnostics.join("\n"), MISSING_MATERIALIZED_NODE_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("rejects plans without parent-owned contract seeds", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const plan = createValidPlan();
    plan.contractSeeds = undefined;
    const result = await validatePlan(workspaceRoot, plan);
    assert.match(result.diagnostics.join("\n"), MISSING_CONTRACT_SEEDS_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("rejects incomplete downstream contract seeds", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const plan = createValidPlan();
    plan.contractSeeds = [
      {
        nodeId: "cluster:finder-widget/note-selection-cluster",
        requiredStatuses: ["data-found"],
        blockingQuestions: [],
      },
    ];
    const result = await validatePlan(workspaceRoot, plan);
    const diagnostics = result.diagnostics.join("\n");
    assert.match(diagnostics, INCOMPLETE_CONTRACT_SEED_RE);
    assert.match(diagnostics, REQUIRED_OWNED_MODULES_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
