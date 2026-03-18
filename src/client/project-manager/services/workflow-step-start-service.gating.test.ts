import assert from "node:assert/strict";
import test from "node:test";
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
  updatedAt: "2026-03-18T10:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "in_progress",
    diagram_modules: "idle",
    diagram_facades: "idle",
  },
  continuity: { chains: [] },
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
      diagram_facades: false,
    },
  },
  ...overrides,
});

test("startDiagramModules starts from virtual-simulation artifact without completed status", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  let captured:
    | {
        readonly questionnairePath: string;
        readonly stage?: string;
      }
    | null = null;

  const service = new WorkflowStepStartService({
    getWorkflowState: async () =>
      createWorkflowState({
        stages: {
          description: "completed",
          virtual_simulation: "in_progress",
          diagram_modules: "idle",
          diagram_facades: "idle",
        },
      }),
    submitService: {
      submitQuestionnaire: async (params) => {
        captured = {
          questionnairePath: params.questionnairePath,
          stage: params.stage,
        };
        return "dm-session";
      },
    },
  });

  const sessionId = await service.startDiagramModules({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "codexCli",
  });

  assert.equal(sessionId, "dm-session");
  assert.deepEqual(captured, {
    questionnairePath:
      ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
    stage: "diagram_modules",
  });
});

test("startDiagramFacades starts from module-map artifact without completed status", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  let captured:
    | {
        readonly questionnairePath: string;
        readonly stage?: string;
      }
    | null = null;

  const service = new WorkflowStepStartService({
    getWorkflowState: async () =>
      createWorkflowState({
        stages: {
          description: "completed",
          virtual_simulation: "in_progress",
          diagram_modules: "in_progress",
          diagram_facades: "idle",
        },
      }),
    submitService: {
      submitQuestionnaire: async (params) => {
        captured = {
          questionnairePath: params.questionnairePath,
          stage: params.stage,
        };
        return "df-session";
      },
    },
  });

  const sessionId = await service.startDiagramFacades({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "codexCli",
  });

  assert.equal(sessionId, "df-session");
  assert.deepEqual(captured, {
    questionnairePath: ".codeai-hub/demo-workspace/diagram_modules/module-map.md",
    stage: "diagram_facades",
  });
});

test("diagram stage start still rejects when gating stays blocked", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  const service = new WorkflowStepStartService({
    getWorkflowState: async () =>
      createWorkflowState({
        gating: {
          blocked: {
            description: false,
            virtual_simulation: false,
            diagram_modules: true,
            diagram_facades: false,
          },
        },
      }),
    submitService: {
      submitQuestionnaire: async () => "unexpected-session",
    },
  });

  await assert.rejects(
    () =>
      service.startDiagramModules({
        workspaceName: "Demo Workspace",
        workspacePath: "/tmp/demo",
        workspaceSlug: "demo-workspace",
        providerId: "codexCli",
      }),
    /Missing virtual-simulation\.md/
  );
});
