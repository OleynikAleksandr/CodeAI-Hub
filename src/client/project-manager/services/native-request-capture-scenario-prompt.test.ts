import assert from "node:assert/strict";
import test from "node:test";
import type {
  CoreWorkflowPromptPack,
  WorkflowStageId,
} from "./description-submit-service";
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

const buildTargetPath = (stage: WorkflowStageId): string => {
  if (stage === "description") {
    return ".codeai-hub/demo-workspace/description/Final_Description.md";
  }
  if (stage === "virtual_simulation") {
    return ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md";
  }
  if (stage === "diagram_modules") {
    return ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md";
  }
  if (stage === "application_skeleton") {
    return ".codeai-hub/demo-workspace/application_skeleton/application-skeleton.md";
  }
  return ".codeai-hub/demo-workspace/quality_gates/quality-gates.md";
};

const loadPromptPack = async (params: {
  readonly artifactLanguage: string;
  readonly chatLanguage: string;
  readonly stage: WorkflowStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<CoreWorkflowPromptPack> => ({
  absolutePath: `${params.workspacePath}/${buildTargetPath(params.stage)}`,
  artifactLanguage: params.artifactLanguage,
  chatLanguage: params.chatLanguage,
  content: `Core prompt pack for ${params.stage}`,
  inputPath: `core-input:${params.stage}`,
  promptPath: `/contracts/${params.stage}.md`,
  relativePath: buildTargetPath(params.stage),
  templatePath: `/templates/${params.stage}.md`,
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
        loadPromptPack,
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
        loadPromptPack,
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
    loadPromptPack,
    scenarioId: "virtual_simulation",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(
    virtualSimulation.inputPath,
    "core-input:virtual_simulation"
  );
  assert.equal(virtualSimulation.prompt, "Core prompt pack for virtual_simulation");

  const diagramModules = await buildNativeRequestCaptureScenarioPrompt({
    bypassUpstreamGuard: true,
    getWorkflowState: async () => createWorkflowState(),
    loadPromptPack,
    scenarioId: "diagram_modules",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(
    diagramModules.inputPath,
    "core-input:diagram_modules"
  );

  const diagramModulesSubstep = await buildNativeRequestCaptureScenarioPrompt({
    bypassUpstreamGuard: true,
    getWorkflowState: async () =>
      createWorkflowState({
        diagramModulesProgress: { substep: "part-detail" },
      }),
    loadPromptPack,
    scenarioId: "diagram_modules",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(
    diagramModulesSubstep.inputPath,
    "core-input:diagram_modules"
  );
});
