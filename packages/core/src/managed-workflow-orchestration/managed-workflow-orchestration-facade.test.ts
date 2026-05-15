import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ManagedWorkflowOrchestrationFacade,
  type ManagedWorkflowOrchestrationFacadeContract,
} from ".";
import { validateDiagramModulesManagedArtifacts } from "./diagram-modules/diagram-modules-validator";
import type { ManagedWorkflowStepController } from "./managed-workflow-step-controller";
import { ManagedWorkflowStepRegistry } from "./managed-workflow-step-registry";

const MANAGED_WORKFLOW_CLUSTER_MESSAGE_PATTERN =
  /Managed Workflow Orchestration cluster/u;
const PRODUCT_PART_CONTINUATION_PROMPT_PATTERN =
  /Materialize only Product Part "core-runtime"/u;
const TEMP_WORKSPACE_PREFIX = "codeai-managed-workflow-";

const createTempWorkspace = async (): Promise<string> => {
  const workspaceRoot = path.join(
    tmpdir(),
    `${TEMP_WORKSPACE_PREFIX}${randomUUID()}`
  );
  await mkdir(workspaceRoot, { recursive: true });
  return workspaceRoot;
};

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const writeValidDiagramModulesArtifacts = async (
  workspaceRoot: string,
  workspaceSlug: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
    [
      "# Product Parts",
      "",
      "| # | Product Part ID | File | Summary |",
      "|---|---|---|---|",
      "| 1 | `core-runtime` | `product-parts/core-runtime.md` | Core runtime |",
      "",
    ].join("\n")
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/core-runtime.md`,
    ["# Product Part: core-runtime", "", "Core runtime modules."].join("\n")
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/diagram_modules/module-map.flow.json`,
    JSON.stringify({ nodes: [], edges: [] }, null, 2)
  );
};

const buildManagedDispatchController = (): ManagedWorkflowStepController => ({
  createPreviewBoundary: () => ({
    code: "managed_workflow_preview_boundary",
    message: "Preview should not be used for managed dispatch.",
  }),
  descriptor: {
    displayName: "Diagram Modules",
    phaseTypes: ["core_gated", "user_led_review", "persistent_user_return"],
    stageId: "diagram_modules",
    startPolicy: "managed_dispatch",
  },
  ownedPathGlobs: [".codeai-hub/**/diagram_modules/**"],
  phases: [],
});

test("managed workflow facade exposes registered trunk stages through the public contract", () => {
  const facade: ManagedWorkflowOrchestrationFacadeContract =
    new ManagedWorkflowOrchestrationFacade();

  assert.deepEqual(
    facade.listRegisteredStages().map((stage) => stage.stageId),
    [
      "description",
      "virtual_simulation",
      "diagram_modules",
      "application_skeleton",
      "quality_gates",
    ]
  );
  assert.equal(facade.canHandleStage("diagram_modules"), true);
  assert.equal(facade.canHandleStage("description"), true);
  assert.equal(
    facade.describeStage("description")?.startPolicy,
    "provider_direct"
  );
  assert.equal(
    facade.describeStage("diagram_modules")?.startPolicy,
    "managed_dispatch"
  );
  assert.equal(
    facade.describeStage("application_skeleton")?.startPolicy,
    "managed_dispatch"
  );
  assert.equal(
    facade.describeStage("quality_gates")?.startPolicy,
    "managed_dispatch"
  );
});

test("managed workflow facade accepts valid Diagram Modules provider turns", async () => {
  const workspaceSlug = "demo-workspace";
  const workspaceRoot = await createTempWorkspace();
  try {
    await writeValidDiagramModulesArtifacts(workspaceRoot, workspaceSlug);
    const facade = new ManagedWorkflowOrchestrationFacade();

    const decision = await facade.validateProviderTurn({
      occurredAt: "2026-05-15T10:00:00.000Z",
      providerId: "codexCli",
      sessionId: "session-1",
      stageId: "diagram_modules",
      workspaceRoot,
      workspaceSlug,
    });

    assert.ok(decision);
    assert.equal(decision.accepted, true);
    assert.deepEqual(decision.reasons, []);
    assert.equal(decision.snapshot.stageId, "diagram_modules");
    assert.equal(decision.snapshot.status, "waiting_for_user");
    assert.equal(decision.snapshot.blocker, null);
    assert.equal(
      decision.effects.some(
        (effect) =>
          effect.kind === "append_core_message" &&
          effect.visibleToUser &&
          effect.message === "Core accepted the current managed phase."
      ),
      true
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Diagram Modules validation accepts an index-only subturn and requests the first Product Part", async () => {
  const workspaceSlug = "demo-workspace";
  const workspaceRoot = await createTempWorkspace();
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      ["# Product Parts", "", "1. `core-runtime`"].join("\n")
    );

    const validation = await validateDiagramModulesManagedArtifacts({
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(validation.valid, true);
    assert.equal(validation.nextAction, "dispatch_next_product_part");
    assert.equal(validation.currentPartId, "core-runtime");
    assert.deepEqual(validation.generatedPartIds, []);
    assert.match(
      validation.nextPrompt ?? "",
      PRODUCT_PART_CONTINUATION_PROMPT_PATTERN
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("managed workflow facade rejects malformed Diagram Modules index turns", async () => {
  const workspaceSlug = "demo-workspace";
  const workspaceRoot = await createTempWorkspace();
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      ["# Product Parts", "", "No Product Part ids yet."].join("\n")
    );
    const facade = new ManagedWorkflowOrchestrationFacade();

    const decision = await facade.validateProviderTurn({
      occurredAt: "2026-05-15T10:00:00.000Z",
      providerId: "codexCli",
      sessionId: "session-2",
      stageId: "diagram_modules",
      workspaceRoot,
      workspaceSlug,
    });

    assert.ok(decision);
    assert.equal(decision.accepted, false);
    assert.equal(decision.snapshot.stageId, "diagram_modules");
    assert.equal(decision.snapshot.status, "waiting_for_provider");
    assert.equal(decision.snapshot.blocker?.owner, "provider");
    assert.equal(
      decision.reasons.some((reason) =>
        reason.includes("does not declare Product Part ids")
      ),
      true
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("managed workflow facade lets preliminary provider-direct stages dispatch normally", () => {
  const facade = new ManagedWorkflowOrchestrationFacade();

  for (const stageId of ["description", "virtual_simulation"]) {
    const decision = facade.resolveStageStart({
      providerId: "claudeCodeCli",
      stageId,
      workspaceRoot: "/tmp/demo",
      workspaceSlug: "demo",
    });

    assert.ok(decision);
    assert.equal(decision.canDispatchProvider, true);
    assert.equal(decision.code, "managed_workflow_provider_direct");
    assert.equal(decision.message, "");
    assert.equal(decision.mode, "provider_direct");
    assert.equal(
      facade.previewStageStart({
        providerId: "claudeCodeCli",
        stageId,
        workspaceRoot: "/tmp/demo",
        workspaceSlug: "demo",
      }),
      null
    );
  }
});

test("managed workflow facade does not return preview boundaries for dispatched technical stages", () => {
  const facade = new ManagedWorkflowOrchestrationFacade();

  for (const stageId of [
    "diagram_modules",
    "application_skeleton",
    "quality_gates",
  ]) {
    assert.equal(
      facade.previewStageStart({
        providerId: "codexCli",
        stageId,
        workspaceRoot: "/tmp/demo",
        workspaceSlug: "demo",
      }),
      null
    );
  }
});

test("managed workflow facade can return managed dispatch decisions through the public contract", () => {
  const facade = new ManagedWorkflowOrchestrationFacade({
    registry: new ManagedWorkflowStepRegistry([
      buildManagedDispatchController(),
    ]),
  });

  const decision = facade.resolveStageStart({
    providerId: "codexCli",
    stageId: "diagram_modules",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo",
  });

  assert.ok(decision);
  assert.equal(decision.canDispatchProvider, true);
  assert.equal(decision.code, "managed_workflow_managed_dispatch");
  assert.equal(decision.controllerId, "diagram_modules");
  assert.equal(decision.mode, "managed_dispatch");
  assert.match(decision.message, MANAGED_WORKFLOW_CLUSTER_MESSAGE_PATTERN);
  assert.equal(
    facade.previewStageStart({
      providerId: "codexCli",
      stageId: "diagram_modules",
      workspaceRoot: "/tmp/demo",
      workspaceSlug: "demo",
    }),
    null
  );
});
