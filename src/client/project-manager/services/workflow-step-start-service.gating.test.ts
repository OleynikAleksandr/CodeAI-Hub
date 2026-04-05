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
    application_foundation_envelope: "idle",
  },
  continuity: { chains: [] },
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
      application_foundation_envelope: true,
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
          application_foundation_envelope: "idle",
        },
      }),
    getSettingsPayload: () =>
      ({
        settings: {
          general: {
            localization: {
              categories: {
                artifactsForTheUser: "ru",
              },
            },
          },
        },
      }) as const,
    submitService: {
      submitQuestionnaire: async (params) => {
        captured = {
          artifactLanguage: params.artifactLanguage,
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
    questionnairePath:
      ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
    stage: "diagram_modules",
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
            application_foundation_envelope: true,
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

test("startApplicationFoundationEnvelope starts from diagram modules artifacts when gating is open", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  let captured:
    | {
        readonly artifactLanguage?: string;
        readonly questionnairePath: string;
        readonly stage?: string;
      }
    | null = null;

  const service = new WorkflowStepStartService({
    getWorkflowState: async () =>
      createWorkflowState({
        stages: {
          description: "completed",
          virtual_simulation: "completed",
          diagram_modules: "completed",
          application_foundation_envelope: "idle",
        },
        gating: {
          blocked: {
            description: false,
            virtual_simulation: false,
            diagram_modules: false,
            application_foundation_envelope: false,
          },
        },
      }),
    getSettingsPayload: () =>
      ({
        settings: {
          general: {
            localization: {
              categories: {
                artifactsForTheUser: "uk",
              },
            },
          },
        },
      }) as const,
    submitService: {
      submitQuestionnaire: async (params) => {
        captured = {
          artifactLanguage: params.artifactLanguage,
          questionnairePath: params.questionnairePath,
          stage: params.stage,
        };
        return "afe-session";
      },
    },
  });

  const sessionId = await service.startApplicationFoundationEnvelope({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "codexCli",
  });

  assert.equal(sessionId, "afe-session");
  assert.deepEqual(captured, {
    artifactLanguage: "uk",
    questionnairePath:
      ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md",
    stage: "application_foundation_envelope",
  });
});

test("application foundation envelope start rejects when gating stays blocked", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  const service = new WorkflowStepStartService({
    getWorkflowState: async () => createWorkflowState(),
    submitService: {
      submitQuestionnaire: async () => "unexpected-session",
    },
  });

  await assert.rejects(
    () =>
      service.startApplicationFoundationEnvelope({
        workspaceName: "Demo Workspace",
        workspacePath: "/tmp/demo",
        workspaceSlug: "demo-workspace",
        providerId: "codexCli",
      }),
    /Diagram Modules is not fully ready/
  );
});
