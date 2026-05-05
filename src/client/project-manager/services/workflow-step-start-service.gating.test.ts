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
  },
  continuity: { chains: [] },
  lastActive: null,
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
    },
  },
  ...overrides,
});

test("startDiagramModules starts from virtual-simulation artifact without completed status", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  let captured:
    | {
        readonly artifactLanguage?: string;
        readonly chatLanguage?: string;
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
        },
      }),
    getSettingsPayload: () =>
      ({
        settings: {
          general: {
            localization: {
              categories: {
                artifactsForTheUser: "ru",
                reasoning: "uk",
              },
            },
          },
        },
      }) as const,
    submitService: {
      submitQuestionnaire: async (params) => {
        captured = {
          artifactLanguage: params.artifactLanguage,
          chatLanguage: params.chatLanguage,
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
    artifactLanguage: "ru",
    chatLanguage: "uk",
    questionnairePath:
      ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
    stage: "diagram_modules",
  });
});

test("startVirtualSimulation passes chat language from reasoning settings", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  let captured:
    | {
        readonly artifactLanguage?: string;
        readonly chatLanguage?: string;
        readonly questionnairePath: string;
        readonly providerId?: string;
        readonly stage?: string;
      }
    | null = null;

  const service = new WorkflowStepStartService({
    getWorkflowState: async () =>
      createWorkflowState({
        description: {
          finalPath:
            ".codeai-hub/demo-workspace/description/Final_Description.md",
          questionnairePath:
            ".codeai-hub/demo-workspace/description/questionnaire.md",
          updatedAt: "2026-03-18T10:00:00.000Z",
        },
      }),
    getSettingsPayload: () =>
      ({
        settings: {
          general: {
            localization: {
              categories: {
                artifactsForTheUser: "ru",
                reasoning: "uk",
              },
            },
          },
        },
      }) as const,
    submitService: {
      submitQuestionnaire: async (params) => {
        captured = {
          artifactLanguage: params.artifactLanguage,
          chatLanguage: params.chatLanguage,
          providerId: params.providerId,
          questionnairePath: params.questionnairePath,
          stage: params.stage,
        };
        return "vs-session";
      },
    },
  });

  const sessionId = await service.startVirtualSimulation({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "codexCli",
  });

  assert.equal(sessionId, "vs-session");
  assert.deepEqual(captured, {
    artifactLanguage: "ru",
    chatLanguage: "uk",
    providerId: "codexCli",
    questionnairePath:
      ".codeai-hub/demo-workspace/description/Final_Description.md",
    stage: "virtual_simulation",
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
