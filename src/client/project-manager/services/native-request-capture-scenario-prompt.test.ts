import assert from "node:assert/strict";
import test from "node:test";
import type { WorkflowContractSnapshot } from "./description-submit-service";
import type { WorkflowStageId } from "./prompt-pack-builder";
import type { WorkflowStateSnapshot } from "./workflow-state-client";

const installWindowStub = (): void => {
  if ("window" in globalThis) {
    return;
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener: () => {},
      clearTimeout,
      codeaiBridgeConfig: {
        httpUrl: "http://127.0.0.1:8080",
        wsUrl: "ws://127.0.0.1:8080",
      },
      dispatchEvent: () => true,
      setTimeout,
    } as unknown as Window & typeof globalThis,
  });
};

const createWorkflowState = (
  overrides?: Partial<WorkflowStateSnapshot>
): WorkflowStateSnapshot => ({
  workspaceSlug: "demo-workspace",
  updatedAt: "2026-05-01T10:00:00.000Z",
  stages: {
    description: "idle",
    virtual_simulation: "idle",
    diagram_modules: "idle",
    application_skeleton: "idle",
    quality_gates: "idle",
  },
  continuity: { chains: [] },
  lastActive: null,
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: true,
      diagram_modules: true,
      application_skeleton: true,
      quality_gates: true,
    },
  },
  ...overrides,
});

const loadContract = async (
  stage: WorkflowStageId
): Promise<WorkflowContractSnapshot> => ({
  prompt: `Prompt for ${stage}`,
  schema: {},
  template: "",
  paths: {
    prompt: `/contracts/${stage}.md`,
    template: `/templates/${stage}.md`,
  },
});

test("scenario prompt resolver keeps upstream guard by default", async () => {
  installWindowStub();
  const { buildNativeRequestCaptureScenarioPrompt } = await import(
    "./native-request-capture-scenario-prompt"
  );

  await assert.rejects(
    () =>
      buildNativeRequestCaptureScenarioPrompt({
        getWorkflowState: async () => createWorkflowState(),
        loadContract,
        scenarioId: "virtual_simulation",
        workspacePath: "/tmp/demo",
        workspaceSlug: "demo-workspace",
      }),
    /Missing Final_Description\.md/
  );

  await assert.rejects(
    () =>
      buildNativeRequestCaptureScenarioPrompt({
        getWorkflowState: async () => createWorkflowState(),
        loadContract,
        scenarioId: "diagram_modules",
        workspacePath: "/tmp/demo",
        workspaceSlug: "demo-workspace",
      }),
    /Missing virtual-simulation\.md/
  );
});

test("scenario prompt resolver bypass returns canonical paths for empty workspace", async () => {
  installWindowStub();
  const { buildNativeRequestCaptureScenarioPrompt } = await import(
    "./native-request-capture-scenario-prompt"
  );

  const virtualSimulation = await buildNativeRequestCaptureScenarioPrompt({
    bypassUpstreamGuard: true,
    getWorkflowState: async () => createWorkflowState(),
    loadContract,
    scenarioId: "virtual_simulation",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(
    virtualSimulation.inputPath,
    ".codeai-hub/demo-workspace/description/Final_Description.md"
  );

  const diagramModules = await buildNativeRequestCaptureScenarioPrompt({
    bypassUpstreamGuard: true,
    getWorkflowState: async () => createWorkflowState(),
    loadContract,
    scenarioId: "diagram_modules",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(
    diagramModules.inputPath,
    ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md"
  );

  const diagramModulesSubstep = await buildNativeRequestCaptureScenarioPrompt({
    bypassUpstreamGuard: true,
    getWorkflowState: async () =>
      createWorkflowState({
        diagramModulesProgress: { substep: "part-detail" },
      }),
    loadContract,
    scenarioId: "diagram_modules",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(
    diagramModulesSubstep.inputPath,
    ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md"
  );
});
