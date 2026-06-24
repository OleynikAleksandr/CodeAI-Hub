import assert from "node:assert/strict";
import test from "node:test";
import type { Settings } from "../../ui/src/components/settings/settings-state-model";
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
    application_skeleton: "idle",
    quality_gates: "idle",
  },
  continuity: { chains: [] },
  lastActive: null,
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
      application_skeleton: false,
      quality_gates: false,
    },
  },
  managedWorkflowPreview: {
    active: true,
    mode: "preview",
    readOnlyStages: [],
    reason: "Managed Workflow Orchestration cluster is active.",
    stages: [],
  },
  ...overrides,
});
const createSettings = (): Settings => ({
  general: {
    coreControls: { allowRestart: true },
    localization: {
      categories: {
        artifactsForTheUser: "en",
        interactiveTemplates: "en",
        messagesForTheUser: "en",
        reasoning: "en",
        systemFeedback: "en",
        uiHelperText: "en",
        uiInterface: "en",
        uiLabels: "en",
        userGuidance: "en",
        workflowTerms: "en",
      },
      defaultLanguage: "en",
      engineId: "google-gtx",
      glossaryEnabled: false,
      reasoningEngineId: "google-gtx",
      workflowTermsPolicy: "keep_english",
    },
    responsePolicy: {
      mode: "hybrid",
      strictOutput: {
        instructionText: "",
        schemaText: "{}",
      },
    },
    textToSpeech: { rate: 1 },
  },
  providers: {
    claude: {
      autoUpdate: { enabled: false },
      defaultModel: "sonnet",
      sessionContinuity: { remainingPercentThreshold: 30 },
      thinking: { enabled: true, effort: "medium" },
      thinkingDisplaySyncEnabled: true,
    },
    codex: {
      autoUpdate: { enabled: false },
      defaultModel: "gpt-5.2",
      reasoningByModel: { "gpt-5.2": "medium", "gpt-5.4": "low" },
      reasoningSummaryEnabled: true,
      sessionContinuity: { remainingPercentThreshold: 30 },
      thinkingDisplaySyncEnabled: true,
    },
  },
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
          application_skeleton: "idle",
          quality_gates: "idle",
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
            application_skeleton: true,
            quality_gates: true,
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

test("startVirtualSimulation is read-only after Diagram Modules starts", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

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
        stages: {
          description: "completed",
          virtual_simulation: "completed",
          diagram_modules: "in_progress",
          application_skeleton: "idle",
          quality_gates: "idle",
        },
        managedWorkflowPreview: {
          active: true,
          mode: "preview",
          readOnlyStages: ["virtual_simulation"],
          reason: "Managed Workflow Orchestration cluster is active.",
          stages: [],
        },
      }),
    submitService: {
      submitQuestionnaire: async () => "unexpected-session",
    },
  });

  await assert.rejects(
    () =>
      service.startVirtualSimulation({
        workspaceName: "Demo Workspace",
        workspacePath: "/tmp/demo",
        workspaceSlug: "demo-workspace",
        providerId: "codexCli",
      }),
    /Virtual Simulation is read-only after Diagram Modules has started/
  );
});

test("remaining technical root stages launch through managed dispatch", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  const captured: Array<{ readonly questionnairePath: string; readonly stage?: string }> = [];
  const service = new WorkflowStepStartService({
    getWorkflowState: async () =>
      createWorkflowState({
        gating: {
          blocked: {
            description: false,
            virtual_simulation: false,
            diagram_modules: false,
            application_skeleton: false,
            quality_gates: false,
          } as WorkflowStateSnapshot["gating"]["blocked"],
        },
      }),
    submitService: {
      submitQuestionnaire: async (params) => {
        captured.push({
          questionnairePath: params.questionnairePath,
          stage: params.stage,
        });
        return `${params.stage ?? "unknown"}-session`;
      },
    },
  });

  await service.startApplicationSkeleton({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "codexCli",
  });
  await service.startQualityGates({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "codexCli",
  });

  assert.deepEqual(captured, [
    {
      questionnairePath:
        ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md",
      stage: "application_skeleton",
    },
    {
      questionnairePath:
        ".codeai-hub/demo-workspace/application_skeleton/application-skeleton-map.json",
      stage: "quality_gates",
    },
  ]);
});

test("technical stage start reuses active boundary session instead of sending a fresh draft prompt", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  const service = new WorkflowStepStartService({
    getWorkflowState: async () =>
      createWorkflowState({
        continuity: {
          chains: [
            {
              rootSessionId: "qg-root",
              workspaceSlug: "demo-workspace",
              stage: "quality_gates",
              updatedAt: "2026-03-18T11:00:00.000Z",
              segments: [
                {
                  createdAt: "2026-03-18T11:00:00.000Z",
                  providerId: "codexCli",
                  providerSessionId: "managed-preview-boundary",
                  sessionId: "existing-qg-boundary-session",
                },
              ],
            },
          ],
        },
      }),
    submitService: {
      submitQuestionnaire: async () => {
        throw new Error("fresh prompt must not be sent for active continuity");
      },
    },
  });

  let createdSessionId: string | null = null;
  const sessionId = await service.startQualityGates({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "codexCli",
    onSessionCreated: (value) => {
      createdSessionId = value;
    },
  });

  assert.equal(sessionId, "existing-qg-boundary-session");
  assert.equal(createdSessionId, "existing-qg-boundary-session");
});

test("workflow starts persist selected model defaults for supported providers", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  const savedSettings: Settings[] = [];
  const createService = () =>
    new WorkflowStepStartService({
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
      getSettingsPayload: () => ({ settings: createSettings() }),
      saveSettings: (settings) => {
        savedSettings.push(settings);
      },
      submitService: {
        submitQuestionnaire: async (params) => `${params.providerId}-session`,
      },
    });

  await createService().startVirtualSimulation({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "claudeCodeCli",
    modelId: "opus",
    reasoning: "high",
  });
  await createService().startVirtualSimulation({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "codexCli",
    modelId: "gpt-5.4",
    reasoning: "xhigh",
  });
  assert.equal(savedSettings[0]?.providers.claude.defaultModel, "opus");
  assert.equal(savedSettings[0]?.providers.claude.thinking.effort, "high");
  assert.equal(savedSettings[1]?.providers.codex.defaultModel, "gpt-5.4");
  assert.equal(savedSettings[1]?.providers.codex.reasoningByModel["gpt-5.4"], "xhigh");
});
